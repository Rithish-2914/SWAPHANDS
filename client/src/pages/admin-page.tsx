import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavigationHeader } from "@/components/navigation-header";
import { Redirect } from "wouter";
import { Users, Package, Flag, Clock } from "lucide-react";
import type { User } from "@shared/schema";

export default function AdminPage() {
  const { user } = useAuth();

  // Redirect if not admin
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: adminStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      return res.json();
    },
  });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      return res.json();
    },
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (isVerified: boolean) => {
    return isVerified ? "text-accent bg-accent/10" : "text-muted-foreground bg-muted";
  };

  const getStatusText = (isVerified: boolean) => {
    return isVerified ? "Active" : "Pending";
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-users">
                    {adminStats?.totalUsers || 0}
                  </p>
                </div>
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Items</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-active-items">
                    {adminStats?.activeItems || 0}
                  </p>
                </div>
                <Package className="h-5 w-5 text-accent" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Messages</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-messages">
                    {adminStats?.totalMessages || 0}
                  </p>
                </div>
                <Flag className="h-5 w-5 text-destructive" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reviews</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-pending-reviews">0</p>
                </div>
                <Clock className="h-5 w-5 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Management */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle>User Management</CardTitle>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search users..."
                  className="w-64"
                  data-testid="input-search-users"
                />
                <Button variant="outline" data-testid="button-export">
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium">User</th>
                      <th className="text-left p-4 text-sm font-medium">Email</th>
                      <th className="text-left p-4 text-sm font-medium">Registration</th>
                      <th className="text-left p-4 text-sm font-medium">Branch</th>
                      <th className="text-left p-4 text-sm font-medium">Status</th>
                      <th className="text-left p-4 text-sm font-medium">Joined</th>
                      <th className="text-left p-4 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="border-b border-border">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary-foreground">
                                {getInitials(userItem.firstName, userItem.lastName)}
                              </span>
                            </div>
                            <span className="font-medium" data-testid={`text-user-name-${userItem.id}`}>
                              {userItem.firstName} {userItem.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground" data-testid={`text-user-email-${userItem.id}`}>
                          {userItem.email}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground" data-testid={`text-user-reg-${userItem.id}`}>
                          {userItem.registrationNumber || "N/A"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground" data-testid={`text-user-branch-${userItem.id}`}>
                          {userItem.branch || "N/A"}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(userItem.isVerified)}`}>
                            {getStatusText(userItem.isVerified)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground" data-testid={`text-user-joined-${userItem.id}`}>
                          {formatDate(userItem.createdAt)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" data-testid={`button-view-user-${userItem.id}`}>
                              View
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" data-testid={`button-suspend-user-${userItem.id}`}>
                              Suspend
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
