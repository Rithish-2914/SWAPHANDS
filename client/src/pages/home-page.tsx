import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/navigation-header";
import { ItemCard } from "@/components/item-card";
import { Link } from "wouter";
import { Package, CheckCircle, Heart, Mail, Plus, Search, Box } from "lucide-react";
import type { Item } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();
  
  const { data: recentItems = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const res = await fetch("/api/items?limit=4");
      return res.json();
    },
  });

  const { data: myItemsCount = 0 } = useQuery({
    queryKey: ["/api/my-items", "count"],
    queryFn: async () => {
      const res = await fetch("/api/my-items");
      const items = await res.json();
      return items.length;
    },
  });

  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["/api/wishlist", "count"],
    queryFn: async () => {
      const res = await fetch("/api/wishlist");
      const items = await res.json();
      return items.length;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary to-accent rounded-lg p-6 text-primary-foreground">
            <h2 className="text-2xl font-bold mb-2" data-testid="text-welcome">
              Welcome back, {user?.firstName}!
            </h2>
            <p className="text-primary-foreground/80">
              Discover amazing deals from your fellow VIT students
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Items Listed</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-items-listed">
                    {myItemsCount}
                  </p>
                </div>
                <Package className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Items Sold</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-items-sold">0</p>
                </div>
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Wishlist Items</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-wishlist-count">
                    {wishlistCount}
                  </p>
                </div>
                <Heart className="h-5 w-5 text-destructive" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Messages</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-messages-count">0</p>
                </div>
                <Mail className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Items */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Items</h3>
            <Button variant="ghost" asChild data-testid="link-view-all">
              <Link href="/browse">View All</Link>
            </Button>
          </div>
          
          {recentItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No items available</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to list an item in the marketplace!
                </p>
                <Button asChild data-testid="button-list-first-item">
                  <Link href="/sell">List Your First Item</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="ghost" className="w-full justify-start" asChild data-testid="button-list-item">
                  <Link href="/sell">
                    <Plus className="h-4 w-4 mr-3" />
                    List New Item
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild data-testid="button-browse">
                  <Link href="/browse">
                    <Search className="h-4 w-4 mr-3" />
                    Browse Marketplace
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild data-testid="button-manage-items">
                  <Link href="/my-items">
                    <Box className="h-4 w-4 mr-3" />
                    Manage My Items
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p data-testid="text-activity-empty">No recent activity to show</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
