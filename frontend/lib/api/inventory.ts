import { apiClient } from "@/lib/api-client";
import { type InventoryItem, type CreateInventoryItem } from "@/lib/validators";

export const getInventory = async () => {
  const response = await apiClient.get<InventoryItem[]>("/inventory");
  return response.data;
};

export const createInventoryItem = async (data: CreateInventoryItem) => {
  const response = await apiClient.post<InventoryItem>("/inventory", data);
  return response.data;
};

export const updateInventoryItem = async (id: string, data: Partial<CreateInventoryItem>) => {
  const response = await apiClient.patch<InventoryItem>(`/inventory/${id}`, data);
  return response.data;
};

export const deleteInventoryItem = async (id: string) => {
  await apiClient.delete(`/inventory/${id}`);
};

export const getInventoryValue = async () => {
  const response = await apiClient.get<{ total_inventory_value: string }>(
    "/inventory/financial/inventory-value"
  );
  return response.data;
};