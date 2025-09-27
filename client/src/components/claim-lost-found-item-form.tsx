import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, FileIcon, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertLostFoundClaimSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertLostFoundClaimSchema.extend({
  proofFiles: z.any().optional()
});

type FormData = z.infer<typeof formSchema>;

interface ClaimLostFoundItemFormProps {
  itemId: string;
  onSuccess?: () => void;
}

export function ClaimLostFoundItemForm({ itemId, onSuccess }: ClaimLostFoundItemFormProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      brand: "",
      model: "",
      serialNumber: "",
      color: "",
      purchaseLocation: "",
      estimatedValue: undefined,
      additionalIdentifiers: "",
      contactPreference: "email",
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      formData.append("description", data.description);
      formData.append("lostFoundItemId", itemId);
      
      // Add all the new detailed fields
      if (data.brand) formData.append("brand", data.brand);
      if (data.model) formData.append("model", data.model);
      if (data.serialNumber) formData.append("serialNumber", data.serialNumber);
      if (data.color) formData.append("color", data.color);
      if (data.purchaseDate) formData.append("purchaseDate", data.purchaseDate.toISOString());
      if (data.purchaseLocation) formData.append("purchaseLocation", data.purchaseLocation);
      if (data.estimatedValue) formData.append("estimatedValue", data.estimatedValue.toString());
      if (data.additionalIdentifiers) formData.append("additionalIdentifiers", data.additionalIdentifiers);
      if (data.contactPreference) formData.append("contactPreference", data.contactPreference);
      
      selectedFiles.forEach((file) => {
        formData.append("proofFiles", file);
      });

      const response = await fetch("/api/lost-found-claims", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit claim");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lost-found-claims"] });
      toast({
        title: "Claim Submitted",
        description: "Your claim has been submitted for review. You'll be notified when an admin reviews it.",
      });
      form.reset();
      setSelectedFiles([]);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 3) {
      toast({
        title: "Too many files",
        description: "You can upload a maximum of 3 proof files.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => claimMutation.mutate(data))} className="space-y-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proof Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe how you can prove this item belongs to you (e.g., purchase receipt, unique features, when/where you lost it)..."
                  {...field}
                  rows={4}
                  data-testid="input-proof-description"
                />
              </FormControl>
              <FormDescription>
                Provide detailed information that helps verify your ownership of this item.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Item Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Item Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Apple, Samsung, Dell" {...field} data-testid="input-brand" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., iPhone 14, Galaxy S23" {...field} data-testid="input-model" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Black, Blue, Silver" {...field} data-testid="input-color" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number (if available)</FormLabel>
                  <FormControl>
                    <Input placeholder="Serial or IMEI number" {...field} data-testid="input-serial-number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Purchase Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Purchase Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="purchaseLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Amazon, Flipkart, Local store" {...field} data-testid="input-purchase-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimatedValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Value (₹)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 50000" 
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      data-testid="input-estimated-value" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="additionalIdentifiers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Identifying Features</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any scratches, stickers, custom modifications, unique marks, etc."
                    {...field}
                    rows={3}
                    data-testid="input-additional-identifiers"
                  />
                </FormControl>
                <FormDescription>
                  Describe any unique features that help identify this item as yours.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPreference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Contact Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-contact-preference">
                      <SelectValue placeholder="How should we contact you?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="both">Both Email and Phone</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Proof Files Upload */}
        <div>
          <FormLabel>Proof Files (Optional)</FormLabel>
          <FormDescription className="mb-3">
            Upload receipts, photos showing the item is yours, or other proof documents (max 3 files).
          </FormDescription>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <label htmlFor="proof-files" className="cursor-pointer">
                  <span className="text-sm font-medium text-primary hover:text-primary/80">
                    Click to upload proof files
                  </span>
                  <Input
                    id="proof-files"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="sr-only"
                    data-testid="input-proof-files"
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Images, PDF, Word documents up to 10MB each
                </p>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm truncate" data-testid={`text-file-name-${index}`}>
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => removeFile(index)}
                      data-testid={`button-remove-file-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => onSuccess?.()} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={claimMutation.isPending}
            data-testid="button-submit-claim"
          >
            {claimMutation.isPending ? "Submitting..." : "Submit Claim"}
          </Button>
        </div>
      </form>
    </Form>
  );
}