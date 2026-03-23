import prisma from "@/lib/prisma";
import { snapshotToYjsState } from "@/lib/server/workspace-doc-collab";

async function main() {
  const docs = await prisma.workspace_docs.findMany({
    where: {
      kind: "page",
    },
    select: {
      id: true,
      content: true,
      author_id: true,
      state: {
        select: {
          doc_id: true,
        },
      },
    },
  });

  let created = 0;

  for (const doc of docs) {
    if (doc.state?.doc_id) continue;

    await prisma.workspace_doc_states.create({
      data: {
        doc_id: doc.id,
        yjs_state: snapshotToYjsState(doc.content),
        updated_by: doc.author_id,
      },
    });
    created += 1;
  }

  console.log(`Backfilled ${created} workspace doc states.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
