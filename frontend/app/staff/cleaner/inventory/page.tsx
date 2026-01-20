"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, AlertCircle, Package } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RouteGuard } from "@/components/route-guard";
import { getInventory, updateInventoryItem } from "@/lib/api/inventory";
import { InventoryStatus } from "@/lib/validators";

export default function CleanerInventoryPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<InventoryStatus>("normal");
  const [newNotes, setNewNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: getInventory,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem) return;
      return updateInventoryItem(selectedItem.id, {
        status: newStatus,
        notes: newNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setIsDialogOpen(false);
    },
  });

  const filteredItems = items?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const openUpdateDialog = (item: any) => {
    setSelectedItem(item);
    setNewStatus(item.status);
    setNewNotes(item.notes || "");
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: InventoryStatus) => {
    switch (status) {
      case "normal": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
      case "low_stock": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/20";
      case "broken": return "bg-red-500/15 text-red-400 border-red-500/20";
      case "lost": return "bg-slate-500/15 text-slate-400 border-slate-500/20";
      case "need_replacement": return "bg-orange-500/15 text-orange-400 border-orange-500/20";
      default: return "bg-slate-500/15 text-slate-400";
    }
  };

  return (
    <RouteGuard requiredRole="cleaner">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Inventory</h1>
            <p className="text-slate-400">Manage cleaning supplies and report issues</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading inventory...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems?.map((item) => (
                <Card key={item.id} className="bg-slate-800 border-slate-700 flex flex-col">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <CardTitle className="text-lg font-medium text-slate-100">
                        {item.name}
                    </CardTitle>
                    <Package className="h-5 w-5 text-slate-400" />
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-4 flex-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Quantity:</span>
                            <span className="text-slate-100 font-bold">{item.quantity}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Status:</span>
                            <Badge className={getStatusColor(item.status)}>
                                {item.status.replace("_", " ")}
                            </Badge>
                        </div>

                        <div className="bg-slate-900/50 p-3 rounded-md text-sm text-slate-300">
                            <span className="text-xs text-slate-500 block mb-1">Notes:</span>
                            {item.notes ?? ""}
                        </div>
                    </div>

                    <Button 
                        onClick={() => openUpdateDialog(item)}
                        variant="outline" 
                        className="w-full border-slate-600 hover:bg-slate-700 mt-4"
                    >
                        Report Issue / Update
                    </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
            <DialogHeader>
              <DialogTitle>Update {selectedItem?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={newStatus} 
                  onValueChange={(v) => setNewStatus(v as InventoryStatus)}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="broken">Broken</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="need_replacement">Need Replacement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Describe the issue or current state..."
                  className="bg-slate-900 border-slate-700 min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  );
}