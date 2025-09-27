import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, Package, User } from "lucide-react";
import { SendMessageDialog } from "@/components/send-message-dialog";
import type { Item, User as UserType } from "@shared/schema";

interface ItemCardProps {
  item: Item;
  showSeller?: boolean;
}

export function ItemCard({ item, showSeller = false }: ItemCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  // Fetch current user to check if they can message the seller
  const { data: currentUser } = useQuery<UserType>({ queryKey: ["/api/user"] });

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (isWishlisted) {
        await apiRequest("DELETE", `/api/wishlist/${item.id}`);
      } else {
        await apiRequest("POST", "/api/wishlist", { itemId: item.id });
      }
    },
    onSuccess: () => {
      setIsWishlisted(!isWishlisted);
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
        description: isWishlisted 
          ? "Item removed from your wishlist" 
          : "Item added to your wishlist",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update wishlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fix: Add a null check for the location parameter
  const formatLocation = (location: string | null) => {
    if (!location) return "";
    return location.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('-');
  };

  // Fix: Add a null check for the category parameter
  const formatCategory = (category: string | null) => {
    if (!category) return "";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Fix: Add a null check for the category parameter
  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "books":
        return "text-secondary-foreground bg-secondary/50";
      case "gadgets":
        return "text-accent bg-accent/10";
      case "uniforms":
        return "text-muted-foreground bg-muted";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlistMutation.mutate();
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" data-testid={`item-card-${item.id}`}>
      {/* Fix: Check that item.photos is not null before accessing its length or elements */}
      {item.photos && item.photos.length > 0 ? (
        <img
          src={`/uploads/${item.photos[0]}`}
          alt={item.title ?? ''}
          className="w-full h-40 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-200"
        />
      ) : (
        <div className="w-full h-40 sm:h-48 bg-muted flex items-center justify-center">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {/* Fix: Pass a potentially null category to the function */}
          <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(item.category ?? null)}`}>
            {formatCategory(item.category ?? null)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className={`p-1 h-auto transition-colors ${
              isWishlisted ? "text-destructive" : "text-muted-foreground hover:text-destructive"
            }`}
            onClick={handleWishlistToggle}
            disabled={toggleWishlistMutation.isPending}
            data-testid={`button-wishlist-${item.id}`}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
          </Button>
        </div>
        
        <h4 className="font-semibold text-sm mb-1 line-clamp-1" data-testid={`text-item-title-${item.id}`}>
          {item.title ?? 'Untitled'}
        </h4>
        
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {item.description ?? 'No description available'}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          {/* Fix: Use optional chaining to handle a potentially null price */}
          <span className="text-lg font-bold text-primary" data-testid={`text-item-price-${item.id}`}>
            ₹{item.price !== null ? item.price.toLocaleString() : "N/A"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatLocation(item.location ?? null)}
          </span>
        </div>
        
        {/* Contact Seller Section */}
        <div className="mt-3 pt-3 border-t border-border">
          <SendMessageDialog 
            item={item} 
            receiverId={item.sellerId} 
            currentUser={currentUser} 
          />
        </div>

        {showSeller && (
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
            <div className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span data-testid={`text-item-seller-${item.id}`}>Seller Name</span>
            </div>
            <span data-testid={`text-item-date-${item.id}`}>
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
