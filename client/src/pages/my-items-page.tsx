import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/navigation-header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Plus, Eye, Heart, MoreVertical, Package, Edit, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Item } from "@shared/schema";

export default function MyItemsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"active" | "sold" | "draft">("active");

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/my-items", { status: activeTab }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("status", activeTab);
      const res = await fetch(`/api/my-items?${params.toString()}`);
      return res.json();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Item deleted",
        description: "Your item has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsSoldMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("PUT", `/api/items/${itemId}`, { status: "sold" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Item marked as sold",
        description: "Your item has been marked as sold",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const handleMarkAsSold = (itemId: string) => {
    markAsSoldMutation.mutate(itemId);
  };

  const formatLocation = (location: string | null) => {
    if (!location) return 'Unknown';
    return location.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('-');
  };

  const formatCategory = (category: string | null) => {
    if (!category) return 'Unknown';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-accent bg-accent/10";
      case "sold":
        return "text-green-600 bg-green-100";
      case "draft":
        return "text-muted-foreground bg-muted";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const tabCounts = {
    active: items.filter(item => item.status === "active").length,
    sold: items.filter(item => item.status === "sold").length,
    draft: items.filter(item => item.status === "draft").length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading your items...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">My Items</h2>
          <Button asChild data-testid="button-add-item">
            <Link href="/sell">
              <Plus className="h-4 w-4 mr-2" />
              Add New Item
            </Link>
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="flex space-x-8">
            {(["active", "sold", "draft"] as const).map((tab) => (
              <button
                key={tab}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab(tab)}
                data-testid={`tab-${tab}`}
              >
                {tab} ({tabCounts[tab]})
              </button>
            ))}
          </nav>
        </div>

        {/* Items List */}
        {items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    {item.photos && item.photos.length > 0 ? (
                      <img
                        src={`/uploads/${item.photos[0]}`}
                        alt={item.title ?? ''}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold" data-testid={`text-item-title-${item.id}`}>
                          {item.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-menu-${item.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem data-testid={`menu-edit-${item.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Item
                              </DropdownMenuItem>
                              {item.status === "active" && (
                                <DropdownMenuItem 
                                  onClick={() => handleMarkAsSold(item.id)}
                                  data-testid={`menu-mark-sold-${item.id}`}
                                >
                                  Mark as Sold
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteItem(item.id)}
                                data-testid={`menu-delete-${item.id}`}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete Item
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="font-semibold text-primary" data-testid={`text-item-price-${item.id}`}>
                            ₹{item.price !== null ? item.price.toLocaleString() : 'N/A'}
                          </span>
                          <span className="text-muted-foreground">
                            {formatCategory(item.category ?? null)}
                          </span>
                          <span className="text-muted-foreground">
                            {formatLocation(item.location ?? null)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Eye className="h-4 w-4" />
                          <span data-testid={`text-item-views-${item.id}`}>{item.views} views</span>
                          <Heart className="h-4 w-4 ml-3" />
                          <span>0 likes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No {activeTab} items</h3>
              <p className="text-muted-foreground mb-4">
                {activeTab === "active" 
                  ? "You haven't listed any active items yet."
                  : activeTab === "sold"
                  ? "You haven't sold any items yet."
                  : "You don't have any draft items."}
              </p>
              {activeTab === "active" && (
                <Button asChild data-testid="button-list-first-item">
                  <Link href="/sell">List Your First Item</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
