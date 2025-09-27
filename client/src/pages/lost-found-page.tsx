import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Eye, Clock, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateLostFoundItemForm } from "@/components/create-lost-found-item-form";
import { LostFoundItemDetails } from "@/components/lost-found-item-details";
import type { LostFoundItem, User } from "@shared/schema";

export function LostFoundPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [claimedFilter, setClaimedFilter] = useState("");
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch current user to check if admin
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });

  // Fetch lost and found items with filters
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["/api/lost-found", { search, categoryFilter, claimedFilter }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter);
      if (claimedFilter && claimedFilter !== "all") params.append("isClaimed", claimedFilter);
      return fetch(`/api/lost-found?${params}`).then(res => res.json());
    },
  });

  const categories = [
    { value: "books", label: "Books" },
    { value: "gadgets", label: "Gadgets" },
    { value: "uniforms", label: "Uniforms" },
    { value: "other", label: "Other" },
  ];

  const getStatusBadge = (item: LostFoundItem) => {
    if (item.isClaimed) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Claimed</Badge>;
    }
    return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Available</Badge>;
  };

  return (
    <div className="container mx-auto p-6" data-testid="lost-found-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Lost & Found</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Find items that have been recovered or report found items to help reunite them with their owners.
          </p>
        </div>
        
        {user?.role === "admin" && (
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-found-item">
                <Plus className="w-4 h-4 mr-2" />
                Add Found Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Found Item</DialogTitle>
                <DialogDescription>
                  Post details about an item that has been found so students can claim it.
                </DialogDescription>
              </DialogHeader>
              <CreateLostFoundItemForm onSuccess={() => setShowCreateForm(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48" data-testid="select-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={claimedFilter} onValueChange={setClaimedFilter}>
          <SelectTrigger className="w-full md:w-48" data-testid="select-status">
            <SelectValue placeholder="All Items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="false">Available Only</SelectItem>
            <SelectItem value="true">Claimed Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded mb-4"></div>
                <div className="h-3 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12" data-testid="no-items">
          <div className="text-muted-foreground mb-4">
            <Search className="w-12 h-12 mx-auto mb-2" />
            <p>No items found matching your criteria.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: LostFoundItem) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg mb-1" data-testid={`text-item-title-${item.id}`}>
                      {item.title}
                    </CardTitle>
                    <CardDescription data-testid={`text-item-category-${item.id}`}>
                      {item.category} • {item.foundLocation}
                    </CardDescription>
                  </div>
                  {getStatusBadge(item)}
                </div>
              </CardHeader>
              
              <CardContent>
                {item.photos && item.photos.length > 0 && (
                  <img
                    src={`/uploads/${item.photos[0]}`}
                    alt={item.title}
                    className="w-full h-32 object-cover rounded mb-3"
                    data-testid={`img-item-photo-${item.id}`}
                  />
                )}
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`text-item-description-${item.id}`}>
                  {item.description}
                </p>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground" data-testid={`text-item-date-${item.id}`}>
                    Found {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedItem(item)}
                        data-testid={`button-view-item-${item.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <LostFoundItemDetails item={item} currentUser={user} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}