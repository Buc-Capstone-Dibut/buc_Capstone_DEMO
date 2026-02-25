import { ProjectList } from "@/components/features/workspace/hub/project-list";
import { SidebarLayout } from "@/components/layout/sidebar-layout";

export default function WorkspacePage() {
  return (
    <SidebarLayout>
      <div className="container mx-auto py-8 px-4">
        <ProjectList />
      </div>
    </SidebarLayout>
  );
}
