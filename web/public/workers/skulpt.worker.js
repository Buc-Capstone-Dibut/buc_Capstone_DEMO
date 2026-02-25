/* eslint-disable no-restricted-globals */
// Web Worker for Skulpt Engine (Strict Isolation)

// Import Scripts (Simulated for Worker Environment)
// In a real app, these paths are relative to the worker file or public root
// We assume they are served from /libs/
importScripts("/libs/skulpt.min.js");
importScripts("/libs/skulpt-stdlib.js");

const ctx = self;
const textEncoder = new TextEncoder();

// --- 1. Worker State ---
let isRunning = false;
let nextResolver = null; // Promise resolve function to resume execution
let stepsBuffer = []; // Global buffer to avoid closure issues
let pendingEvents = [];

const TRACE_PREAMBLE = `# --- CTP Trace Helper ---
def trace(event_type, scope=None, **payload):
    payload["type"] = event_type
    if scope is not None:
        payload["scope"] = scope
    _ctp_trace_emit(payload)
`;

const DEFAULT_MAX_STEPS = 10000;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;

// --- 2. Message Handler ---
ctx.onmessage = async (e) => {
  const { type, code, judge } = e.data;

  switch (type) {
    case "RUN_CODE":
      await runSkulpt(code, judge);
      break;
    case "NEXT_STEP":
      if (nextResolver) {
        const resolve = nextResolver;
        nextResolver = null;
        resolve(); // Resume Skulpt
      }
      break;
    case "INPUT_RESPONSE":
      // Handle input() if we ever support it
      break;
  }
};

// --- 3. Core Engine Logic ---
async function runSkulpt(pythonCode, judgeOptions) {
  if (isRunning) return; // Prevent double run
  isRunning = true;

  const stdinLines = Array.isArray(judgeOptions?.stdinLines)
    ? judgeOptions.stdinLines.map((line) => String(line))
    : [];
  const maxSteps =
    typeof judgeOptions?.maxSteps === "number" && judgeOptions.maxSteps > 0
      ? Math.floor(judgeOptions.maxSteps)
      : DEFAULT_MAX_STEPS;
  const maxOutputBytes =
    typeof judgeOptions?.maxOutputBytes === "number" &&
    judgeOptions.maxOutputBytes > 0
      ? Math.floor(judgeOptions.maxOutputBytes)
      : DEFAULT_MAX_OUTPUT_BYTES;
  const captureSteps = judgeOptions?.captureSteps !== false;

  // Reset State
  ctx.postMessage({ type: "STATUS", status: "running" });
  let stepCount = 0;
  let lastLine = null;
  const MAX_EVENTS = 2000; // Cap event buffer to avoid runaway memory
  let outputBytes = 0;
  pendingEvents = [];

  // Mock "output" handler
  const outputBuffer = [];
  stepsBuffer = []; // Reset global buffer
  function outf(text) {
    const chunk = String(text);
    outputBytes += textEncoder.encode(chunk).length;
    if (outputBytes > maxOutputBytes) {
      throw createExecutionError(
        "OLE",
        `Output Limit Exceeded (${maxOutputBytes} bytes)`,
      );
    }
    outputBuffer.push(chunk);
    if (captureSteps) {
      ctx.postMessage({ type: "STDOUT", text: chunk });
    }
  }

  // Configure Skulpt
  // @ts-ignore
  // Inject tracer bridge
  Sk.builtins._ctp_trace_emit = new Sk.builtin.func(function (event) {
    const jsEvent = Sk.ffi.remapToJs(event);
    if (captureSteps && jsEvent && typeof jsEvent === "object") {
      if (!jsEvent.scope) jsEvent.scope = "generic";
      if (pendingEvents.length < MAX_EVENTS) {
        pendingEvents.push(jsEvent);
      }
    }
    return Sk.builtin.none.none$;
  });

  const preambleParts = [TRACE_PREAMBLE];
  if (judgeOptions) {
    preambleParts.push(buildInputPreamble(stdinLines));
  }
  const mergedPreamble = preambleParts.join("\n");
  const preambleLineCount = mergedPreamble.trimEnd().split("\n").length;
  const mergedCode = `${mergedPreamble}\n${pythonCode}`;

  Sk.configure({
    output: outf,
    read: builtinRead,
    __future__: Sk.python3, // Enable Python 3 features

    // --- THE MAGIC: Custom Suspension for Debugging ---
    // This function is called by Skulpt at every line if 'debugging' is true
    breakpoints: function (filename, lineno, colno) {
      if (lineno <= preambleLineCount) return;
      lastLine = lineno;
      stepCount++;
      if (stepCount > maxSteps) {
        throw createExecutionError(
          "TLE",
          "Execution Time Limit Exceeded (Infinite Loop Reference?)",
        );
      }
      if (!captureSteps) {
        return;
      }

      // 1. Capture State (Deep Copy needed to avoid mutation during pause)
      const snapshot = captureGlobals(Sk.globals);

      // 2. Buffer "Step"
      stepsBuffer.push({
        line: Math.max(1, lineno - preambleLineCount),
        col: colno,
        variables: snapshot,
        stdout: [...outputBuffer],
        events: pendingEvents.splice(0),
      });

      // 3. NO PAUSE - Continuous Execution for CTP Prototype
      // To prevent UI freezing in heavy loops, we could await a tiny delay every N steps
      // But for now, let's just run.
      // We rely on Sk.execLimit (default) or our own counter to stop infinite loops
    },
    debugging: true, // Enable Step-Debugging
  });

  try {
    // Run Code
    // @ts-ignore
    await Sk.misceval.asyncToPromise(() => {
      // @ts-ignore
      return Sk.importMainWithBody("<stdin>", false, mergedCode, true);
    });

    if (captureSteps && pendingEvents.length > 0) {
      const snapshot = captureGlobals(Sk.globals);
      stepsBuffer.push({
        line: lastLine ? Math.max(1, lastLine - preambleLineCount) : 1,
        col: 0,
        variables: snapshot,
        stdout: [...outputBuffer],
        events: pendingEvents.splice(0),
      });
    }

    ctx.postMessage({
      type: "RESULT",
      stdout: outputBuffer.join(""),
      stepCount,
      outputBytes,
    });
    if (captureSteps) {
      // SEND ALL STEPS AT ONCE
      ctx.postMessage({ type: "BATCH_STEPS", steps: stepsBuffer });
    }
    ctx.postMessage({ type: "STATUS", status: "completed" });
  } catch (e) {
    const serializedError = normalizeWorkerError(e);
    ctx.postMessage({
      type: "ERROR",
      message: serializedError.message,
      code: serializedError.code,
    });
  } finally {
    isRunning = false;
    nextResolver = null;
  }
}

function createExecutionError(code, message) {
  const error = new Error(message);
  error.ctpCode = code;
  return error;
}

function normalizeWorkerError(error) {
  const raw = error?.toString?.() ?? String(error);
  if (error?.ctpCode) {
    return { message: raw, code: error.ctpCode };
  }
  if (raw.includes("Execution Time Limit Exceeded")) {
    return { message: raw, code: "TLE" };
  }
  if (raw.includes("Output Limit Exceeded")) {
    return { message: raw, code: "OLE" };
  }
  return { message: raw, code: "RTE" };
}

function buildInputPreamble(lines) {
  const serializedLines = JSON.stringify(lines);
  return `# --- CTP Judge Input Helper ---
_judge_lines = ${serializedLines}
_judge_idx = [0]

def input(prompt=""):
    i = _judge_idx[0]
    if i >= len(_judge_lines):
        raise EOFError("No more input available")
    _judge_idx[0] = i + 1
    return _judge_lines[i]
`;
}

// --- 4. Helper: Builtin Read ---
function builtinRead(x) {
  if (
    Sk.builtinFiles === undefined ||
    Sk.builtinFiles["files"][x] === undefined
  )
    throw "File not found: '" + x + "'";
  return Sk.builtinFiles["files"][x];
}

// --- 5. Helper: State Capture (Serializer) ---
// Converts Skulpt's complex internal objects into JSON-friendly format
// --- 5. Helper: State Capture (Serializer) ---
// Converts Skulpt's complex internal objects into JSON-friendly format
// Preserves object identity/cycles for graph structures (Linked Lists)

function captureGlobals(globals) {
  const visited = new Map(); // Map<SkulptObject, JSObject>

  function serialize(val) {
    // 1. Primitive handling (return raw value)
    if (val === undefined || val === null) return null;

    // 2. Already visited (Cycle detection / Shared Reference)
    if (visited.has(val)) {
      return visited.get(val);
    }

    // 3. Skulpt Primitives
    // Sk.builtin.int, float, str, bool, none...
    // We can use Sk.ffi.remapToJs for simple types, but need to be careful not to recurse into complex ones.
    // Helper: check type name
    const typeName = val.tp$name;

    if (!typeName) {
      // Raw JS values (shouldn't happen often in Sk.globals but possible)
      return val;
    }

    if (
      typeName === "int" ||
      typeName === "float" ||
      typeName === "str" ||
      typeName === "bool"
    ) {
      return Sk.ffi.remapToJs(val);
    }
    if (typeName === "NoneType") return null;

    // 4. Complex Types (Create placeholder -> Register execution -> Fill content)
    let result;

    if (typeName === "list" || typeName === "tuple") {
      result = [];
      visited.set(val, result); // Register before recursion
      // Iterate Skulpt list
      // val.v is the internal array
      if (val.v && Array.isArray(val.v)) {
        val.v.forEach((item) => {
          result.push(serialize(item));
        });
      }
    } else if (typeName === "dict") {
      result = {};
      visited.set(val, result);
      // Iterate keys
      // dict uses internal combination of keys/values
      // simpler to use Sk.builtin.dict methods or iterate internal items if accessible
      // accessing internal .entries() or similar is safest if exposed, else remapToJs might be easier but risky

      // Fallback: Sk.ffi.remapToJs works well for dicts usually, but we want our recursion.
      // Manual iteration:
      if (val.tp$iter) {
        const it = val.tp$iter(val);
        let item;
        while ((item = it.tp$iternext()) !== undefined) {
          const jsKey = Sk.ffi.remapToJs(item); // keys are usually strings/ints
          const skVal = val.mp$subscript(item);
          result[jsKey] = serialize(skVal);
        }
      }
    } else {
      // 5. Custom Objects / Instances (e.g. Node)

      // STABLE ID GENERATION
      // We attach a unique ID to the Skulpt object itself so it persists across steps
      if (!val._ctp_id) {
        val._ctp_id = "obj-" + Math.random().toString(36).substr(2, 9);
      }

      // Captured as Generic Object with type info
      result = { __type: typeName, __id: val._ctp_id };
      visited.set(val, result);

      // Inspect attributes (stored in $d)
      if (val.$d) {
        // Check if $d is a Skulpt Dict (Python 3)
        if (val.$d.tp$name === "dict") {
          const dict = val.$d;
          if (dict.tp$iter) {
            const it = dict.tp$iter(dict);
            let item;
            while ((item = it.tp$iternext()) !== undefined) {
              const jsKey = Sk.ffi.remapToJs(item);
              const skVal = dict.mp$subscript(item);
              if (typeof jsKey === "string" && jsKey.startsWith("__")) continue;
              result[jsKey] = serialize(skVal);
            }
          }
        } else {
          // Legacy Object Behavior
          for (const key in val.$d) {
            if (key.startsWith("__")) continue;
            result[key] = serialize(val.$d[key]);
          }
        }
      }
    }

    return result;
  }

  const result = {};

  // [FIX] Robustly Handle Skulpt Globals (can be Dict or Object)
  if (globals && globals.tp$name === "dict") {
    // Option A: Use internal storage if available and simple (unreliable across versions)
    // Option B: Use iterator protocol (safest)
    if (globals.tp$iter) {
      const it = globals.tp$iter(globals);
      let item;
      while ((item = it.tp$iternext()) !== undefined) {
        // Key is usually a Skulpt String
        const jsKey = Sk.ffi.remapToJs(item);
        const skVal = globals.mp$subscript(item);

        if (typeof jsKey === "string" && !jsKey.startsWith("__")) {
          result[jsKey] = serialize(skVal);
        }
      }
    }
  } else {
    // Fallback for Python 2 or Plain Objects
    for (const key in globals) {
      if (key.startsWith("__")) continue;
      result[key] = serialize(globals[key]);
    }
  }
  return result;
}
