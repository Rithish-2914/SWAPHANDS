import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/navigation-header";
import { ItemCard } from "@/components/item-card";
import { Search, Package } from "lucide-react";
import type { Item } from "@shared/schema";

export default function BrowsePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [priceRange, setPriceRange] = useState("");

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items", { search, category, location, priceRange }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category && category !== "all") params.append("category", category);
      if (location && location !== "all") params.append("location", location);
      if (priceRange && priceRange !== "all") {
        const [min, max] = priceRange.split("-");
        if (min) params.append("minPrice", min);
        if (max) params.append("maxPrice", max);
      }
      
      const res = await fetch(`/api/items?${params.toString()}`);
      return res.json();
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Query will automatically refetch due to state change
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="gadgets">Gadgets</SelectItem>
                    <SelectItem value="uniforms">Uniforms</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-location">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="a-block">A-Block</SelectItem>
                    <SelectItem value="b-block">B-Block</SelectItem>
                    <SelectItem value="c-block">C-Block</SelectItem>
                    <SelectItem value="d-block">D-Block</SelectItem>
                    <SelectItem value="e-block">E-Block</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-price">
                    <SelectValue placeholder="Price: Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Price: Any</SelectItem>
                    <SelectItem value="0-500">Under ₹500</SelectItem>
                    <SelectItem value="500-2000">₹500 - ₹2,000</SelectItem>
                    <SelectItem value="2000-10000">₹2,000 - ₹10,000</SelectItem>
                    <SelectItem value="10000-">Above ₹10,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading items...</p>
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="mb-4">
              <p className="text-muted-foreground" data-testid="text-results-count">
                Found {items.length} item{items.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} showSeller />
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground mb-4">
                {search || category || location || priceRange
                  ? "Try adjusting your search filters"
                  : "No items have been listed yet"}
              </p>
              {search || category || location || priceRange ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setCategory("");
                    setLocation("");
                    setPriceRange("");
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
