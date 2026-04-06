import { ProjectList } from "@/components/features/workspace/hub/project-list";
import { Footer } from "@/components/layout/footer";
import { SidebarLayout } from "@/components/layout/sidebar-layout";

export default function WorkspacePage() {
  return (
    <SidebarLayout>
      <div className="container mx-auto flex-1 py-8 px-4">
        <ProjectList />
      </div>
      <Footer />
    </SidebarLayout>
  );
}
