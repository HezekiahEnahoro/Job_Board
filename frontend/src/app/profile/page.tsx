"use client";

import { useEffect, useState } from "react";
import { getToken, getCurrentUser, logout, type User } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User as UserIcon,
  Mail,
  Calendar,
  Crown,
  LogOut,
  Trash2,
  Save,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    loadUser();
  }, [router]);

  const loadUser = async () => {
    const userData = await getCurrentUser();
    if (userData) {
      setUser(userData);
      setFullName(userData.full_name || "");
    }
    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_name: fullName }),
      });

      if (res.ok) {
        toast.success("Profile updated!");
        await loadUser();
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone.",
      )
    ) {
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API}/auth/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success("Account deleted");
        logout();
      } else {
        toast.error("Failed to delete account");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-white/5 rounded-lg w-48"></div>
            <div className="h-64 bg-white/5 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8 space-y-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
              <UserIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">Profile</h1>
              <p className="text-gray-400">Manage your account settings</p>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="group relative mb-8">
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl opacity-50 group-hover:opacity-75 blur transition"></div>
          <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
            <form onSubmit={handleUpdate} className="space-y-6">
              {/* Account Status */}
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-white/5">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="font-semibold">{user.email}</p>
                  </div>
                </div>

                {user.is_pro && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400/10 to-orange-500/10 border border-yellow-500/20">
                    <Crown className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-400">
                      PRO
                    </span>
                  </div>
                )}
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-3 pb-6 border-b border-white/10">
                <div className="p-3 rounded-xl bg-white/5">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Member Since</p>
                  <p className="font-semibold">
                    {new Date(user.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="fullName"
                  className="text-sm text-gray-400 flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50"
                />
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </div>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Upgrade Card (if not pro) */}
        {!user.is_pro && (
          <div className="group relative mb-8">
            <div className="absolute -inset-px bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl opacity-75 group-hover:opacity-100 blur-xl transition"></div>
            <div className="relative rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-950/30 to-orange-950/30 backdrop-blur-xl p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Upgrade to Pro</h3>
                  <p className="text-gray-400 mb-4">
                    Unlock unlimited applications, AI analyses, and priority
                    support for just $15/month
                  </p>
                  <Link href="/upgrade">
                    <Button className="bg-white text-black hover:bg-white/90 font-bold">
                      Upgrade Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-3xl opacity-50 blur transition"></div>
          <div className="relative rounded-3xl border border-red-500/20 bg-red-950/10 backdrop-blur-xl p-8">
            <h3 className="text-xl font-bold text-red-400 mb-4">Danger Zone</h3>

            <div className="space-y-4">
              <Button
                onClick={() => logout()}
                variant="outline"
                className="w-full h-12 border-white/20 bg-white/5 hover:bg-white/10">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>

              <Button
                onClick={handleDeleteAccount}
                variant="outline"
                className="w-full h-12 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/30">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
