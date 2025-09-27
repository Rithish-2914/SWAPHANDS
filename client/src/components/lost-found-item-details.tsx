import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Calendar, CheckCircle, Clock, User, Phone } from "lucide-react";
import { ClaimLostFoundItemForm } from "@/components/claim-lost-found-item-form";
import { ManageClaimsDialog } from "@/components/manage-claims-dialog";
import type { LostFoundItem, User as UserType, LostFoundClaim } from "@shared/schema";

interface LostFoundItemDetailsProps {
  item: LostFoundItem;
  currentUser?: UserType;
}

export function LostFoundItemDetails({ item, currentUser }: LostFoundItemDetailsProps) {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showManageClaims, setShowManageClaims] = useState(false);
  const queryClient = useQueryClient();

  // Fix: Explicitly define the return type for claims
  const { data: claims = [] } = useQuery<LostFoundClaim[]>({
    queryKey: ["/api/lost-found-claims", { lostFoundItemId: item.id }],
    enabled: currentUser?.role === "admin",
  });

  // Check if current user has already submitted a claim
  const { data: userClaims = [] } = useQuery<LostFoundClaim[]>({
    queryKey: ["/api/lost-found-claims", { lostFoundItemId: item.id, claimantId: currentUser?.id }],
    enabled: !!currentUser && currentUser.role === "student",
  });

  const hasUserClaimed = userClaims.length > 0;
  const userClaim = userClaims[0];

  const getStatusBadge = () => {
    if (item.isClaimed) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-4 h-4 mr-1" />Claimed</Badge>;
    }
    return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-4 h-4 mr-1" />Available</Badge>;
  };

  const getClaimStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" data-testid="lost-found-item-details">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-2" data-testid="text-item-title">{item.title}</h2>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <span data-testid="text-item-category">{item.category}</span>
            <span>•</span>
            <MapPin className="w-4 h-4" />
            <span data-testid="text-item-location">{item.foundLocation}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span data-testid="text-item-date">Found on {new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {getStatusBadge()}
          {currentUser?.role === "admin" && claims.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManageClaims(true)}
              data-testid="button-manage-claims"
            >
              <User className="w-4 h-4 mr-1" />
              {claims.length} Claim{claims.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Photos */}
      {item.photos && item.photos.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Photos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {item.photos.map((photo, index) => (
              <img
                key={index}
                src={`/uploads/${photo}`}
                alt={`${item.title} photo ${index + 1}`}
                className="w-full h-64 object-cover rounded-lg"
                data-testid={`img-item-photo-${index}`}
              />
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Description */}
      <div className="space-y-3">
        <h3 className="font-semibold">Description</h3>
        <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-item-description">
          {item.description}
        </p>
      </div>

      {/* User's Claim Status */}
      {currentUser?.role === "student" && hasUserClaimed && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Your Claim Status</h4>
            {getClaimStatusBadge(userClaim.status)}
          </div>
          <p className="text-sm text-muted-foreground mb-2" data-testid="text-user-claim-description">
            {userClaim.description}
          </p>
          {userClaim.reviewNotes && (
            <div className="mt-2 p-2 bg-background rounded border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Admin Notes:</p>
              <p className="text-sm" data-testid="text-admin-notes">{userClaim.reviewNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {currentUser?.role === "student" && !item.isClaimed && !hasUserClaimed && (
          <Dialog open={showClaimForm} onOpenChange={setShowClaimForm}>
            <DialogTrigger asChild>
              <Button data-testid="button-claim-item">
                <Phone className="w-4 h-4 mr-2" />
                Claim This Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Claim Item</DialogTitle>
                <DialogDescription>
                  Provide proof that this item belongs to you. An admin will review your claim.
                </DialogDescription>
              </DialogHeader>
              <ClaimLostFoundItemForm 
                itemId={item.id} 
                onSuccess={() => {
                  setShowClaimForm(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/lost-found-claims"] });
                }} 
              />
            </DialogContent>
          </Dialog>
        )}

        {currentUser?.role === "admin" && (
          <ManageClaimsDialog
            item={item}
            claims={claims}
            isOpen={showManageClaims}
            onOpenChange={setShowManageClaims}
          />
        )}
      </div>
    </div>
  );
}
