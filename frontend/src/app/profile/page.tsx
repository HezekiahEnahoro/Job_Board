"use client";

import { useEffect, useState } from "react";
import { getToken, getCurrentUser, logout, type User } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Bell,
  Target,
  MapPin,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type EmailPreferences = {
  id: number;
  enabled: boolean;
  frequency: "daily" | "weekly" | "disabled";
  min_match_score: number;
  remote_only: boolean;
  last_sent_at: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Email preferences state
  const [emailPreferences, setEmailPreferences] =
    useState<EmailPreferences | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    loadUser();
    loadEmailPreferences();
  }, [router]);

  const loadUser = async () => {
    const userData = await getCurrentUser();
    if (userData) {
      setUser(userData);
      setFullName(userData.full_name || "");
    }
    setLoading(false);
  };

  const loadEmailPreferences = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API}/emails/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setEmailPreferences(data);
      }
    } catch (error) {
      console.error("Failed to load email preferences", error);
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
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

  const handleSaveEmailPreferences = async () => {
    const token = getToken();
    if (!token || !emailPreferences) return;

    try {
      setSavingPreferences(true);
      const res = await fetch(`${API}/emails/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(emailPreferences),
      });

      if (res.ok) {
        toast.success("Email preferences saved!");
        loadEmailPreferences();
      } else {
        toast.error("Failed to save preferences");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setSavingPreferences(false);
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
              <UserIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black">Profile & Settings</h1>
              <p className="text-gray-400">
                Manage your account and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Account Info Card */}
        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl opacity-50 group-hover:opacity-75 blur transition"></div>
          <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Account Information</h2>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Email & Status */}
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
                <Label htmlFor="fullName" className="text-gray-400">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="h-12 bg-white/5 border-white/10 text-white"
                />
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Email Preferences Card */}
        {!loadingPreferences && emailPreferences && (
          <div className="group relative">
            <div className="absolute -inset-px bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl opacity-50 group-hover:opacity-75 blur transition"></div>
            <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 space-y-6">
              <h2 className="text-2xl font-bold">Email Alerts</h2>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">
                      Enable Email Alerts
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Get personalized job recommendations in your inbox
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailPreferences.enabled}
                  onCheckedChange={(checked) =>
                    setEmailPreferences({
                      ...emailPreferences,
                      enabled: checked,
                    })
                  }
                  className="data-[state=checked]:bg-green-600"
                />
              </div>

              {emailPreferences.enabled && (
                <>
                  {/* Frequency */}
                  <div className="space-y-3">
                    <Label>Email Frequency</Label>
                    <Select
                      value={emailPreferences.frequency}
                      onValueChange={(v: "daily" | "weekly" | "disabled") =>
                        setEmailPreferences({
                          ...emailPreferences,
                          frequency: v,
                        })
                      }>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/10">
                        <SelectItem value="daily">Daily (9 AM)</SelectItem>
                        <SelectItem value="weekly">
                          Weekly (Mondays at 9 AM)
                        </SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Min Match Score */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Minimum Match Score</Label>
                      <span className="text-xl font-bold text-purple-400">
                        {emailPreferences.min_match_score}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={emailPreferences.min_match_score}
                      onChange={(e) =>
                        setEmailPreferences({
                          ...emailPreferences,
                          min_match_score: Number(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-white/10 rounded-lg"
                    />
                  </div>

                  {/* Remote Only */}
                  <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold mb-1">Remote Jobs Only</h3>
                        <p className="text-gray-400 text-sm">
                          Only include fully remote positions
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={emailPreferences.remote_only}
                      onCheckedChange={(checked) =>
                        setEmailPreferences({
                          ...emailPreferences,
                          remote_only: checked,
                        })
                      }
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </div>
                </>
              )}

              <Button
                onClick={handleSaveEmailPreferences}
                disabled={savingPreferences}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                {savingPreferences ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Email Preferences
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Upgrade Card */}
        {!user.is_pro && (
          <div className="group relative">
            <div className="absolute -inset-px bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl opacity-75 blur-xl transition"></div>
            <div className="relative rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-950/30 to-orange-950/30 p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">Upgrade to Pro</h3>
                  <p className="text-gray-400 mb-4">
                    Unlock unlimited AI cover letters, resume analyses, and
                    priority support for just $15/month
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
          <div className="absolute -inset-px bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-3xl blur transition"></div>
          <div className="relative rounded-3xl border border-red-500/20 bg-red-950/10 p-8">
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
                className="w-full h-12 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20">
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
