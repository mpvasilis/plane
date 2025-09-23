import { useState, useCallback } from "react";
import useSWR from "swr";
// services
import { APIService } from "@/services/api.service";
// types
import type { IRecurringWorkItem, IRecurringWorkItemInstance } from "@/types/recurring-work-items";

const apiService = new APIService();

interface UseRecurringWorkItemsReturn {
  // Data
  recurringWorkItems: IRecurringWorkItem[] | undefined;
  recurringWorkItemInstances: IRecurringWorkItemInstance[] | undefined;
  isLoading: boolean;
  error: any;
  
  // Actions
  fetchRecurringWorkItems: () => void;
  fetchRecurringWorkItemInstances: () => void;
  createRecurringWorkItem: (data: Partial<IRecurringWorkItem>) => Promise<IRecurringWorkItem>;
  updateRecurringWorkItem: (itemId: string, data: Partial<IRecurringWorkItem>) => Promise<IRecurringWorkItem>;
  updateRecurringWorkItemStatus: (itemId: string, status: string) => Promise<void>;
  deleteRecurringWorkItem: (itemId: string) => Promise<void>;
  generateWorkItem: (itemId: string, force?: boolean) => Promise<any>;
  generateWorkItemAsync: (itemId: string) => Promise<any>;
  getDueItems: (lookAheadHours?: number) => Promise<IRecurringWorkItem[]>;
  getInstanceStats: (days?: number) => Promise<any>;
}

export const useRecurringWorkItems = (
  workspaceSlug: string,
  projectId: string
): UseRecurringWorkItemsReturn => {
  const [isLoading, setIsLoading] = useState(false);

  // SWR keys
  const recurringWorkItemsKey = `recurring-work-items-${workspaceSlug}-${projectId}`;
  const instancesKey = `recurring-work-item-instances-${workspaceSlug}-${projectId}`;

  // Fetch recurring work items
  const {
    data: recurringWorkItems,
    error: recurringWorkItemsError,
    mutate: mutateRecurringWorkItems,
  } = useSWR<IRecurringWorkItem[]>(
    workspaceSlug && projectId ? recurringWorkItemsKey : null,
    () => apiService.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/recurring-work-items/`)
      .then((response) => response?.data?.results || [])
  );

  // Fetch instances
  const {
    data: recurringWorkItemInstances,
    error: instancesError,
    mutate: mutateInstances,
  } = useSWR<IRecurringWorkItemInstance[]>(
    workspaceSlug && projectId ? instancesKey : null,
    () => apiService.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/recurring-work-item-instances/`)
      .then((response) => response?.data?.results || [])
  );

  const fetchRecurringWorkItems = useCallback(() => {
    mutateRecurringWorkItems();
  }, [mutateRecurringWorkItems]);

  const fetchRecurringWorkItemInstances = useCallback(() => {
    mutateInstances();
  }, [mutateInstances]);

  const createRecurringWorkItem = useCallback(
    async (data: Partial<IRecurringWorkItem>): Promise<IRecurringWorkItem> => {
      try {
        setIsLoading(true);
        const response = await apiService.post(
          `/api/workspaces/${workspaceSlug}/projects/${projectId}/recurring-work-items/`,
          data
        );
        
        // Optimistically update the cache
        mutateRecurringWorkItems();
        
        return response.data;
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceSlug, projectId, mutateRecurringWorkItems]
  );

  const updateRecurringWorkItem = useCallback(
    async (itemId: string, data: Partial<IRecurringWorkItem>): Promise<IRecurringWorkItem> => {
      try {
        setIsLoading(true);
        const response = await apiService.patch(
          `/api/workspaces/${workspaceSlug}/projects/${projectId}/recurring-work-items/${itemId}/`,
          data
        );
        
        // Optimistically update the cache
        mutateRecurringWorkItems();
        
        return response.data;
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceSlug, projectId, mutateRecurringWorkItems]
  );

  const updateRecurringWorkItemStatus = useCallback(
    async (itemId: string, status: string): Promise<void> => {
      try {
        setIsLoading(true);
        await apiService.patch(
          `/api/workspaces/${workspaceSlug}/projects/${projectId}/recurring-work-items/${itemId}/update-status/`,
          { status }
        );
        
        // Optimistically update the cache
        mutateRecurringWorkItems();
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceSlug, projectId, mutateRecurringWorkItems]
  );

  const deleteRecurringWorkItem = useCallback(
    async (itemId: string): Promise<void> => {
      try {
        setIsLoading(true);
        await apiService.delete(
          `/api/workspaces/${workspaceSlug}/projects/${projectId}/recurring-work-items/${itemId}/`
        );
        
        // Optimistically update the cache
        mutateRecurringWorkItems();
        mutateInstances();
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceSlug, projectId, mutateRecurringWorkItems, mutateInstances]
  );

  const generateWorkItem = useCallback(
    async (itemId: string, force: boolean = false): Promise<any> => {
      try {
        setIsLoading(true);
        const response = await apiService.post(
          `/api/workspaces/${workspaceSlug}/projects/${projectId}/recurring-work-items/${itemId}/generate/`,
          { force }
        );
        
        // Update caches
        mutateRecurringWorkItems();
        mutateInstances();
        
        return response.data;
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceSlug, projectId, mutateRecurringWorkItems, mutateInstances]
  );

  const generateWorkItemAsync = useCallback(
    async (itemId: string): Promise<any> => {
      try {
        setIsLoading(true);
        const response = await apiService.post(
          `/api/workspaces/${workspaceSlug}/projects/${projectId}/recurring-work-items/${itemId}/generate-async/`
        );
        
        return response.data;
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceSlug, projectId]
  );

  const getDueItems = useCallback(
    async (lookAheadHours: number = 24): Promise<IRecurringWorkItem[]> => {
      try {
        const response = await apiService.get(
          `/api/workspaces/${workspaceSlug}/projects/${projectId}/recurring-work-items/due-now/`,
          {
            params: { look_ahead_hours: lookAheadHours },
          }
        );
        
        return response.data.results || [];
      } catch (error) {
        throw error;
      }
    },
    [workspaceSlug, projectId]
  );

  const getInstanceStats = useCallback(
    async (days: number = 30): Promise<any> => {
      try {
        const response = await apiService.get(
          `/api/workspaces/${workspaceSlug}/projects/${projectId}/recurring-work-item-instances/stats/`,
          {
            params: { days },
          }
        );
        
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    [workspaceSlug, projectId]
  );

  return {
    // Data
    recurringWorkItems,
    recurringWorkItemInstances,
    isLoading: isLoading || (!recurringWorkItems && !recurringWorkItemsError),
    error: recurringWorkItemsError || instancesError,
    
    // Actions
    fetchRecurringWorkItems,
    fetchRecurringWorkItemInstances,
    createRecurringWorkItem,
    updateRecurringWorkItem,
    updateRecurringWorkItemStatus,
    deleteRecurringWorkItem,
    generateWorkItem,
    generateWorkItemAsync,
    getDueItems,
    getInstanceStats,
  };
};