import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToken } from '../auth/useAuth'
import { useApi } from './context'
import type { Page, ProjectInput, Task, TaskFilters, TaskInput } from './types'

export const keys = {
  projects: ['projects'] as const,
  tasks: (filters: TaskFilters) => ['tasks', filters] as const,
  allTasks: ['tasks'] as const,
  stats: ['stats'] as const,
}

export function useProjects() {
  const api = useApi()
  const token = useToken()
  return useQuery({ queryKey: keys.projects, queryFn: () => api.listProjects(token) })
}

export function useTasks(filters: TaskFilters) {
  const api = useApi()
  const token = useToken()
  return useQuery({
    queryKey: keys.tasks(filters),
    queryFn: () => api.listTasks(token, filters),
    placeholderData: keepPreviousData, // al cambiar de página o filtro no parpadea la lista
  })
}

export function useStats() {
  const api = useApi()
  const token = useToken()
  return useQuery({ queryKey: keys.stats, queryFn: () => api.stats(token) })
}

/** Tras cualquier cambio en tareas se invalidan las listas, los contadores y las estadísticas. */
function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.allTasks }),
      queryClient.invalidateQueries({ queryKey: keys.projects }),
      queryClient.invalidateQueries({ queryKey: keys.stats }),
    ])
}

export function useCreateProject() {
  const api = useApi()
  const token = useToken()
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: (data: ProjectInput) => api.createProject(token, data), onSuccess: invalidate })
}

export function useDeleteProject() {
  const api = useApi()
  const token = useToken()
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: (id: number) => api.deleteProject(token, id), onSuccess: invalidate })
}

export function useCreateTask() {
  const api = useApi()
  const token = useToken()
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: TaskInput }) => api.createTask(token, projectId, data),
    onSuccess: invalidate,
  })
}

export function useUpdateTask() {
  const api = useApi()
  const token = useToken()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaskInput> }) => api.updateTask(token, id, data),
    // Actualización optimista: la interfaz cambia al instante y se deshace si la API falla.
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: keys.allTasks })
      const previous = queryClient.getQueriesData<Page<Task>>({ queryKey: keys.allTasks })
      queryClient.setQueriesData<Page<Task>>({ queryKey: keys.allTasks }, (page) =>
        page && { ...page, items: page.items.map((t) => (t.id === id ? ({ ...t, ...data } as Task) : t)) },
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: invalidate,
  })
}

export function useDeleteTask() {
  const api = useApi()
  const token = useToken()
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: (id: number) => api.deleteTask(token, id), onSuccess: invalidate })
}
