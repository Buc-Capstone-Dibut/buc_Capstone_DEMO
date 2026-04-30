import { redirect } from "next/navigation";

type RedirectPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function buildQuery(searchParams: RedirectPageProps["searchParams"]) {
  const params = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }
    if (value !== undefined) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function NewExperienceRedirect({ searchParams }: RedirectPageProps) {
  redirect(`/career/projects/new${buildQuery(searchParams)}`);
}
