"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { registerForPublicTest } from "@/app/actions/candidate-tests";
import { toast } from "sonner";

export function PublicTestRegistrationClient({ test }: { test: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const accessKey = await registerForPublicTest(test.id, formData);
      toast.success("Registration successful!");
      router.push(`/test/${accessKey}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to register for test");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4 flex flex-col items-center justify-center">
      <Card className="max-w-md w-full border shadow-sm">
        <CardHeader className="text-center pb-6 border-b bg-muted/10">
          <CardTitle className="text-2xl">{test.title}</CardTitle>
          <CardDescription className="mt-2">{test.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form id="registration-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                required
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                required
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="pt-2 pb-6 px-6">
          <Button 
            form="registration-form" 
            type="submit" 
            className="w-full h-11" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registering..." : "Continue to Test"}
          </Button>
        </CardFooter>
      </Card>
      
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p className="mb-1">Time Limit: <span className="font-medium text-foreground">{test.timeLimitMinutes} Minutes</span></p>
        <p>Please ensure you have a stable internet connection before continuing.</p>
      </div>
    </div>
  );
}
