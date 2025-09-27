import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Check, X, User, Calendar, FileIcon, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { LostFoundItem, LostFoundClaim } from "@shared/schema";

interface ManageClaimsDialogProps {
  item: LostFoundItem;
  claims: LostFoundClaim[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageClaimsDialog({ item, claims, isOpen, onOpenChange }: ManageClaimsDialogProps) {
  const [selectedClaim, setSelectedClaim] = useState<LostFoundClaim | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const claimActionMutation = useMutation({
    mutationFn: async ({ claimId, action, notes }: { claimId: string; action: "approve" | "reject"; notes?: string }) => {
      const response = await fetch(`/api/lost-found-claims/${claimId}/${action}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process claim");
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lost-found-claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lost-found"] });
      toast({
        title: "Success",
        description: `Claim ${variables.action}d successfully.`,
      });
      setSelectedClaim(null);
      setAdminNotes("");
      setActionType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return null;
    }
  };

  const handleClaimAction = (claim: LostFoundClaim, action: "approve" | "reject") => {
    setSelectedClaim(claim);
    setActionType(action);
    setAdminNotes("");
  };

  const confirmAction = () => {
    if (!selectedClaim || !actionType) return;
    
    claimActionMutation.mutate({
      claimId: selectedClaim.id,
      action: actionType,
      notes: adminNotes.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Claims - {item.title}</DialogTitle>
          <DialogDescription>
            Review and process claims for this lost and found item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {claims.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No claims have been submitted for this item yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <Card key={claim.id} className="relative">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Claim by {claim.claimantId}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4" />
                          Submitted {new Date(claim.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(claim.status)}
                        {claim.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleClaimAction(claim, "approve")}
                              data-testid={`button-approve-${claim.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleClaimAction(claim, "reject")}
                              data-testid={`button-reject-${claim.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Proof Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`text-claim-description-${claim.id}`}>
                        {claim.description}
                      </p>
                    </div>

                    {claim.proofFiles && claim.proofFiles.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Proof Files</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {claim.proofFiles.map((file, index) => (
                            <a
                              key={index}
                              href={`/uploads/${file}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 text-sm bg-muted rounded hover:bg-muted/80 transition-colors"
                              data-testid={`link-proof-file-${claim.id}-${index}`}
                            >
                              <FileIcon className="w-4 h-4" />
                              <span className="truncate">Proof {index + 1}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {claim.reviewNotes && (
                      <div className="bg-muted/50 p-3 rounded">
                        <h4 className="font-medium mb-1">Admin Notes</h4>
                        <p className="text-sm text-muted-foreground" data-testid={`text-admin-notes-${claim.id}`}>
                          {claim.reviewNotes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Action Confirmation Dialog */}
        {selectedClaim && actionType && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">
                {actionType === "approve" ? "Approve Claim" : "Reject Claim"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {actionType === "approve" 
                  ? "This will mark the item as claimed and reject all other pending claims."
                  : "This will reject this claim. You can provide optional notes for the claimant."
                }
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={
                      actionType === "approve" 
                        ? "Add any additional notes for the claimant..."
                        : "Explain why this claim was rejected..."
                    }
                    className="mt-1"
                    data-testid="input-admin-notes"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedClaim(null);
                      setActionType(null);
                      setAdminNotes("");
                    }}
                    data-testid="button-cancel-action"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmAction}
                    disabled={claimActionMutation.isPending}
                    className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                    data-testid="button-confirm-action"
                  >
                    {claimActionMutation.isPending ? "Processing..." : `${actionType === "approve" ? "Approve" : "Reject"} Claim`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}