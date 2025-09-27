import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/navigation-header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, Share, Package } from "lucide-react";
import type { Wishlist, Item } from "@shared/schema";

type WishlistItem = Wishlist & { item: Item };

export default function WishlistPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wishlistItems = [], isLoading } = useQuery<WishlistItem[]>({
    queryKey: ["/api/wishlist"],
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/wishlist/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: "Removed from wishlist",
        description: "Item has been removed from your wishlist",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRemoveFromWishlist = (itemId: string) => {
    removeFromWishlistMutation.mutate(itemId);
  };

  const handleContactSeller = (item: Item) => {
    // TODO: Implement messaging system
    toast({
      title: "Contact seller",
      description: "Messaging system will be implemented soon",
    });
  };

  const handleShare = (item: Item) => {
    if (navigator.share) {
      navigator.share({
        title: item.title ?? 'Untitled',
        text: item.description ?? 'No description',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Item link copied to clipboard",
      });
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading wishlist...</p>
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
          <h2 className="text-2xl font-bold">My Wishlist</h2>
          <span className="text-sm text-muted-foreground" data-testid="text-wishlist-count">
            {wishlistItems.length} item{wishlistItems.length !== 1 ? "s" : ""} saved
          </span>
        </div>

        {wishlistItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map(({ item, id: wishlistId }) => (
              <Card key={wishlistId} className="overflow-hidden">
                {item.photos && item.photos.length > 0 ? (
                  <img
                    src={`/uploads/${item.photos[0]}`}
                    alt={item.title ?? ''}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                      {formatCategory(item.category)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto text-destructive hover:text-destructive/70"
                      onClick={() => handleRemoveFromWishlist(item.id)}
                      disabled={removeFromWishlistMutation.isPending}
                      data-testid={`button-remove-wishlist-${item.id}`}
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                  <h4 className="font-semibold text-sm mb-1" data-testid={`text-item-title-${item.id}`}>
                    {item.title ?? 'Untitled'}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {item.description ?? 'No description'}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-primary" data-testid={`text-item-price-${item.id}`}>
                      ₹{item.price !== null ? item.price.toLocaleString() : 'N/A'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatLocation(item.location)}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={() => handleContactSeller(item)}
                      data-testid={`button-contact-seller-${item.id}`}
                    >
                      Contact Seller
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3"
                      onClick={() => handleShare(item)}
                      data-testid={`button-share-${item.id}`}
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
              <p className="text-muted-foreground mb-4">
                Start browsing items and add them to your wishlist to keep track of things you're interested in.
              </p>
              <Button asChild data-testid="button-browse-items">
                <a href="/browse">Browse Items</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
