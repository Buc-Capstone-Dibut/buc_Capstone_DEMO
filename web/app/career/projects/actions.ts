"use server";

import {
  deleteProjectAction as deleteProject,
  getAllProjectsAction as getAllProjects,
  getProjectsByIdsAction as getProjectsByIds,
  getWorkspaceProjectImportCandidatesAction as getWorkspaceProjectImportCandidates,
  importWorkspaceProjectCandidateAction as importWorkspaceProjectCandidate,
  markWorkspaceProjectCandidateImportedAction as markWorkspaceProjectCandidateImported,
  prepareWorkspaceProjectDraftAction as prepareWorkspaceProjectDraft,
  saveProjectAction as saveProject,
} from "../experiences/actions";
import type { ProjectInput } from "../experiences/actions";

export async function saveProjectAction(data: ProjectInput) {
  return saveProject(data);
}

export async function deleteProjectAction(id: string) {
  return deleteProject(id);
}

export async function getProjectsByIdsAction(ids: string[]) {
  return getProjectsByIds(ids);
}

export async function getAllProjectsAction() {
  return getAllProjects();
}

export async function getWorkspaceProjectImportCandidatesAction() {
  return getWorkspaceProjectImportCandidates();
}

export async function importWorkspaceProjectCandidateAction(workspaceId: string) {
  return importWorkspaceProjectCandidate(workspaceId);
}

export async function prepareWorkspaceProjectDraftAction(workspaceId: string) {
  return prepareWorkspaceProjectDraft(workspaceId);
}

export async function markWorkspaceProjectCandidateImportedAction(
  workspaceId: string,
  importedProjectId: string,
) {
  return markWorkspaceProjectCandidateImported(workspaceId, importedProjectId);
}
