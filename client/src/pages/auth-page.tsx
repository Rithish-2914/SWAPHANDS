import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRightLeft, Users, Shield, Star, Mail, Lock } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [forgotPasswordForm, setForgotPasswordForm] = useState({ email: "" });
  const [resetPasswordForm, setResetPasswordForm] = useState({ email: "", otp: "", newPassword: "" });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [emailVerificationForm, setEmailVerificationForm] = useState({ email: "", otp: "" });
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailVerificationLoading, setEmailVerificationLoading] = useState(false);
  const [resendVerificationLoading, setResendVerificationLoading] = useState(false);
  const [googleAuthAvailable, setGoogleAuthAvailable] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    registrationNumber: "",
    branch: "",
    year: "",
    hostelBlock: undefined as "a-block" | "b-block" | "c-block" | "d-block" | "e-block" | undefined,
    phoneNumber: "",
    bio: "",
  });

  // Check Google Auth availability
  useEffect(() => {
    fetch("/api/auth/providers")
      .then(res => res.json())
      .then(data => setGoogleAuthAvailable(data.google))
      .catch(() => setGoogleAuthAvailable(false));
  }, []);

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({
      email: loginForm.email,
      password: loginForm.password,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });

      const result = await response.json();
      
      if (response.ok && result.requiresVerification) {
        setEmailVerificationForm({ ...emailVerificationForm, email: registerForm.email });
        setShowEmailVerification(true);
        toast({
          title: "Account created successfully!",
          description: "Please check your email for a verification code to complete your registration.",
        });
      } else if (response.ok && result.user) {
        // User was auto-verified due to email service issues
        toast({
          title: "Account created successfully!",
          description: result.message || "You can now start using VIT SwapHands.",
        });
        window.location.reload(); // Refresh to show logged-in state
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    
    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPasswordForm.email }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setShowForgotPassword(false);
        setShowResetPassword(true);
        setResetPasswordForm({ ...resetPasswordForm, email: forgotPasswordForm.email });
        toast({
          title: "OTP sent successfully",
          description: "Please check your email for the verification code.",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPasswordLoading(true);
    
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetPasswordForm),
      });

      const result = await response.json();
      
      if (response.ok) {
        setShowResetPassword(false);
        setResetPasswordForm({ email: "", otp: "", newPassword: "" });
        toast({
          title: "Password reset successfully",
          description: "You can now sign in with your new password.",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailVerificationLoading(true);
    
    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailVerificationForm),
      });

      const result = await response.json();
      
      if (response.ok) {
        setShowEmailVerification(false);
        toast({
          title: "Email verified successfully!",
          description: "Your account is now active. You can start using VIT SwapHands.",
        });
        // Optionally auto-redirect or refresh to show logged-in state
        window.location.reload();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Email verification error:", error);
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Failed to verify email",
        variant: "destructive",
      });
    } finally {
      setEmailVerificationLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendVerificationLoading(true);
    
    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVerificationForm.email }),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Verification email sent",
          description: "Please check your inbox for a new verification code.",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      toast({
        title: "Failed to resend",
        description: error instanceof Error ? error.message : "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setResendVerificationLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <ArrowRightLeft className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">VIT SWAPHANDS</h1>
            <p className="text-muted-foreground">Student Marketplace</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>Sign in to your VIT SwapHands account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">VIT Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your.name@vitstudent.ac.in"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        required
                        data-testid="input-login-email"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Only @vitstudent.ac.in emails are allowed
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                        data-testid="input-login-password"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-primary hover:underline"
                        data-testid="link-forgot-password"
                      >
                        Forgot your password?
                      </button>
                    </div>

                    {googleAuthAvailable && (
                      <>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                          </div>
                        </div>

                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full"
                          onClick={handleGoogleLogin}
                          data-testid="button-google-login"
                        >
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Continue with Google
                        </Button>
                      </>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>Join the VIT student marketplace</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="register-email">VIT Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your.name@vitstudent.ac.in"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        required
                        data-testid="input-register-email"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="First Name"
                          value={registerForm.firstName}
                          onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                          required
                          data-testid="input-firstName"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Last Name"
                          value={registerForm.lastName}
                          onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                          required
                          data-testid="input-lastName"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        required
                        data-testid="input-register-password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="registrationNumber">Registration Number</Label>
                      <Input
                        id="registrationNumber"
                        placeholder="21BCE1234"
                        value={registerForm.registrationNumber}
                        onChange={(e) => setRegisterForm({ ...registerForm, registrationNumber: e.target.value })}
                        data-testid="input-registrationNumber"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="branch">Branch</Label>
                        <Input
                          id="branch"
                          placeholder="Computer Science"
                          value={registerForm.branch}
                          onChange={(e) => setRegisterForm({ ...registerForm, branch: e.target.value })}
                          data-testid="input-branch"
                        />
                      </div>
                      <div>
                        <Label htmlFor="year">Year</Label>
                        <Select onValueChange={(value) => setRegisterForm({ ...registerForm, year: value })}>
                          <SelectTrigger data-testid="select-year">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1st Year">1st Year</SelectItem>
                            <SelectItem value="2nd Year">2nd Year</SelectItem>
                            <SelectItem value="3rd Year">3rd Year</SelectItem>
                            <SelectItem value="4th Year">4th Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="hostelBlock">Hostel Block</Label>
                      <Select onValueChange={(value) => setRegisterForm({ ...registerForm, hostelBlock: value as "a-block" | "b-block" | "c-block" | "d-block" | "e-block" })}>
                        <SelectTrigger data-testid="select-hostelBlock">
                          <SelectValue placeholder="Select hostel block" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a-block">A-Block</SelectItem>
                          <SelectItem value="b-block">B-Block</SelectItem>
                          <SelectItem value="c-block">C-Block</SelectItem>
                          <SelectItem value="d-block">D-Block</SelectItem>
                          <SelectItem value="e-block">E-Block</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                      data-testid="button-register"
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Forgot Password Dialog */}
          <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
            <DialogContent className="w-full max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Forgot Password
                </DialogTitle>
                <DialogDescription>
                  Enter your email to receive a password reset OTP
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="your.name@vitstudent.ac.in"
                    value={forgotPasswordForm.email}
                    onChange={(e) => setForgotPasswordForm({ email: e.target.value })}
                    required
                    data-testid="input-forgot-email"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForgotPassword(false)}
                    data-testid="button-cancel-forgot"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={forgotPasswordLoading}
                    data-testid="button-send-otp"
                  >
                    {forgotPasswordLoading ? "Sending..." : "Send OTP"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Email Verification Dialog */}
          <Dialog open={showEmailVerification} onOpenChange={setShowEmailVerification}>
            <DialogContent className="w-full max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Verify Your Email
                </DialogTitle>
                <DialogDescription>
                  Enter the 6-digit verification code sent to your email
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEmailVerification} className="space-y-4">
                <div>
                  <Label htmlFor="verification-email">Email</Label>
                  <Input
                    id="verification-email"
                    type="email"
                    value={emailVerificationForm.email}
                    disabled
                    className="bg-muted"
                    data-testid="input-verification-email"
                  />
                </div>
                <div>
                  <Label htmlFor="verification-otp">Verification Code</Label>
                  <Input
                    id="verification-otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={emailVerificationForm.otp}
                    onChange={(e) => setEmailVerificationForm({ ...emailVerificationForm, otp: e.target.value })}
                    required
                    maxLength={6}
                    data-testid="input-verification-otp"
                  />
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendVerificationLoading}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                    data-testid="button-resend-verification"
                  >
                    {resendVerificationLoading ? "Sending..." : "Didn't receive the code? Resend"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowEmailVerification(false)}
                    data-testid="button-cancel-verification"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={emailVerificationLoading}
                    data-testid="button-verify-email"
                  >
                    {emailVerificationLoading ? "Verifying..." : "Verify Email"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
            <DialogContent className="w-full max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Reset Password
                </DialogTitle>
                <DialogDescription>
                  Enter the OTP sent to your email and your new password
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={resetPasswordForm.email}
                    disabled
                    className="bg-muted"
                    data-testid="input-reset-email"
                  />
                </div>
                <div>
                  <Label htmlFor="reset-otp">OTP Code</Label>
                  <Input
                    id="reset-otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={resetPasswordForm.otp}
                    onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, otp: e.target.value })}
                    required
                    data-testid="input-reset-otp"
                  />
                </div>
                <div>
                  <Label htmlFor="reset-new-password">New Password</Label>
                  <Input
                    id="reset-new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={resetPasswordForm.newPassword}
                    onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
                    required
                    data-testid="input-reset-new-password"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowResetPassword(false)}
                    data-testid="button-cancel-reset"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={resetPasswordLoading}
                    data-testid="button-reset-password"
                  >
                    {resetPasswordLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Right side - Hero section */}
      <div className="hidden lg:flex flex-1 bg-primary text-primary-foreground p-8 flex-col justify-center">
        <div className="max-w-md">
          <h2 className="text-4xl font-bold mb-6">
            Your Campus Marketplace
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Buy, sell, and exchange items with fellow VIT students. From textbooks to gadgets, find everything you need.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Student-Only Community</h3>
                <p className="text-primary-foreground/80">Exclusive to VIT students with verified emails</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Safe & Secure</h3>
                <p className="text-primary-foreground/80">Admin-moderated platform for trusted transactions</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Star className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Easy to Use</h3>
                <p className="text-primary-foreground/80">Simple listing and browsing with smart filters</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
