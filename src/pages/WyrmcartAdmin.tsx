import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Edit, Trash2, Upload, Download, RefreshCw, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { storeItems } from "@/data/storeItems";
import { formatHex } from "@/lib/currency";

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  subscription_fee: number | null;
  subscription_interval: string | null;
  quantity_available: number | null;
  is_active: boolean | null;
  specifications: any;
  created_at: string;
}

const emptyForm = {
  name: "",
  description: "",
  price: "0",
  category: "Item",
  subscription_fee: "0",
  subscription_interval: "",
  quantity_available: "",
  specifications: "{}"
};

const WyrmcartAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/admin");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) loadItems();
  }, [isAdmin]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("shop-admin", {
        body: { operation: "get_all_items" }
      });
      if (error) throw error;
      setItems(data?.items || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-shop", {
        body: { items: storeItems }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Store Seeded", description: `${data.inserted} items added to database.` });
      loadItems();
    } catch (err: any) {
      toast({ title: "Seed Failed", description: err.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setEditDialogOpen(true);
  };

  const openEdit = (item: ShopItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      category: item.category || "Item",
      subscription_fee: String(item.subscription_fee || 0),
      subscription_interval: item.subscription_interval || "",
      quantity_available: item.quantity_available != null ? String(item.quantity_available) : "",
      specifications: JSON.stringify(item.specifications || {}, null, 2)
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    let specs = {};
    try { specs = JSON.parse(form.specifications); } catch { /* ignore */ }

    const payload: any = {
      name: form.name,
      description: form.description || null,
      price: parseInt(form.price) || 0,
      category: form.category,
      subscription_fee: parseInt(form.subscription_fee) || 0,
      subscription_interval: form.subscription_interval || null,
      quantity_available: form.quantity_available ? parseInt(form.quantity_available) : null,
      specifications: specs
    };

    try {
      if (editingItem) {
        const { error } = await supabase.functions.invoke("shop-admin", {
          body: { operation: "update_item", id: editingItem.id, ...payload }
        });
        if (error) throw error;
        toast({ title: "Item Updated" });
      } else {
        const { error } = await supabase.functions.invoke("shop-admin", {
          body: { operation: "create_item", ...payload }
        });
        if (error) throw error;
        toast({ title: "Item Created" });
      }
      setEditDialogOpen(false);
      loadItems();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (item: ShopItem) => {
    if (!confirm(`Deactivate "${item.name}"?`)) return;
    try {
      const { error } = await supabase.functions.invoke("shop-admin", {
        body: { operation: "delete_item", id: item.id }
      });
      if (error) throw error;
      toast({ title: "Item Deactivated" });
      loadItems();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("shop-admin", {
        body: { operation: "export_items" }
      });
      if (error) throw error;
      const blob = new Blob([data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "shop_items.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    }
  };

  const filteredItems = items.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.name.toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q);
  });

  const activeCount = items.filter(i => i.is_active).length;

  if (adminLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-green-400 text-xl font-mono">Loading Wyrmcart Admin...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-green-400">Wyrmcart Admin</h1>
            <Badge variant="outline" className="border-green-600 text-green-400">
              {activeCount} active / {items.length} total
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-900/20" onClick={handleSeed} disabled={seeding}>
              <Zap className="w-4 h-4 mr-1" />
              {seeding ? "Seeding..." : "Seed from Catalog"}
            </Button>
            <Button size="sm" variant="outline" className="border-green-600 text-green-400 hover:bg-green-900/20" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" className="border-green-600 text-green-400 hover:bg-green-900/20" onClick={loadItems}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-green-400" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-900 border-green-600/30 text-green-400 placeholder:text-green-400/50"
          />
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-green-500/20 text-left">
                <th className="p-2 text-green-400">Name</th>
                <th className="p-2 text-green-400">Category</th>
                <th className="p-2 text-green-400">Price</th>
                <th className="p-2 text-green-400">Sub Fee</th>
                <th className="p-2 text-green-400">Qty</th>
                <th className="p-2 text-green-400">Status</th>
                <th className="p-2 text-green-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-2 text-white font-medium">{item.name}</td>
                  <td className="p-2 text-gray-300">{item.category || "—"}</td>
                  <td className="p-2 text-green-400">⏣{item.price}</td>
                  <td className="p-2 text-yellow-400">
                    {item.subscription_fee ? `⏣${item.subscription_fee}/${item.subscription_interval || "day"}` : "—"}
                  </td>
                  <td className="p-2 text-gray-300">{item.quantity_available ?? "∞"}</td>
                  <td className="p-2">
                    <Badge className={item.is_active ? "bg-green-900/50 text-green-400 border-green-700" : "bg-red-900/50 text-red-400 border-red-700"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-gray-400 hover:text-white" onClick={() => openEdit(item)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-300" onClick={() => handleDelete(item)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <p className="text-center py-8 text-gray-500">
              {items.length === 0 ? "No items in database. Use 'Seed from Catalog' to populate." : "No matching items."}
            </p>
          )}
        </div>

        {/* Edit/Create Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-gray-900 border-green-600/30 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-green-400">
                {editingItem ? "Edit Item" : "Create Item"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Weapon", "Armor", "Consumable", "Cyberwear", "Item", "Service"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Price (Hex)</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Subscription Fee</Label>
                  <Input type="number" value={form.subscription_fee} onChange={(e) => setForm({...form, subscription_fee: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div>
                  <Label className="text-gray-300">Sub Interval</Label>
                  <Select value={form.subscription_interval} onValueChange={(v) => setForm({...form, subscription_interval: v})}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Quantity Available (blank = unlimited)</Label>
                <Input type="number" value={form.quantity_available} onChange={(e) => setForm({...form, quantity_available: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Specifications (JSON)</Label>
                <Textarea value={form.specifications} onChange={(e) => setForm({...form, specifications: e.target.value})} className="bg-gray-800 border-gray-700 text-white font-mono text-xs" rows={4} />
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleSave}>
                {editingItem ? "Update Item" : "Create Item"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default WyrmcartAdmin;
