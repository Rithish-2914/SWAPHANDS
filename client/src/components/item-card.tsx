import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, Package, User } from "lucide-react";
import { SendMessageDialog } from "@/components/send-message-dialog";
import { fadeInUp, cardHover } from "@/lib/motion";
import type { Item, User as UserType } from "@shared/schema";

interface ItemCardProps {
  item: Item;
  showSeller?: boolean;
}

export function ItemCard({ item, showSeller = false }: ItemCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isWishlisted, setIsWishlisted] = useState(false);
  
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

  const formatLocation = (location: string | null) => {
    if (!location) return "";
    return location.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('-');
  };

  const formatCategory = (category: string | null) => {
    if (!category) return "";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

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
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={cardHover}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        className="relative group"
      >
        <Card className="overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500/20 transition-colors duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800" data-testid={`item-card-${item.id}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <div className="relative">
            {item.photos && item.photos.length > 0 ? (
              <div className="relative overflow-hidden">
                <motion.img
                  src={`/uploads/${item.photos[0]}`}
                  alt={item.title ?? ''}
                  className="w-full h-40 sm:h-48 object-cover"
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={false}
                />
              </div>
            ) : (
              <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center relative overflow-hidden">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Package className="h-12 w-12 text-muted-foreground" />
                </motion.div>
              </div>
            )}
          </div>
      
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between mb-2">
              <motion.span 
                className={`text-xs px-3 py-1 rounded-full font-medium ${getCategoryColor(item.category ?? null)} backdrop-blur-sm`}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {formatCategory(item.category ?? null)}
              </motion.span>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-1 h-auto transition-colors relative ${
                    isWishlisted ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                  }`}
                  onClick={handleWishlistToggle}
                  disabled={toggleWishlistMutation.isPending}
                  data-testid={`button-wishlist-${item.id}`}
                >
                  <motion.div
                    animate={isWishlisted ? {
                      scale: [1, 1.3, 1],
                    } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
                  </motion.div>
                </Button>
              </motion.div>
            </div>
            
            <h4 className="font-semibold text-sm mb-1 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" data-testid={`text-item-title-${item.id}`}>
              {item.title ?? 'Untitled'}
            </h4>
            
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {item.description ?? 'No description available'}
            </p>
            
            <div className="flex items-center justify-between mb-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent" data-testid={`text-item-price-${item.id}`}>
                  ₹{item.price !== null ? item.price.toLocaleString() : "N/A"}
                </span>
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded blur-sm -z-10"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-muted-foreground">
                {formatLocation(item.location ?? null)}
              </span>
            </div>
            
            <div className="mt-3 pt-3 border-t border-border/50">
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

        <motion.div
          className="absolute -inset-[1px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg opacity-0 group-hover:opacity-20 blur-xl -z-10 transition-opacity duration-500"
          initial={false}
        />
      </motion.div>
    </motion.div>
  );
}
