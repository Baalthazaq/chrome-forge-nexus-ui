import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useEffect } from "react";

const appFeatures = [
  {
    name: "Doppleganger",
    description: "Digital Identity / Character Sheet",
    color: "border-violet-500/50",
    features: [
      "Full character sheet with class, subclass, ancestry, and community selection",
      "Stat tracking (Strength, Agility, Finesse, Instinct, Presence, Knowledge)",
      "Combat section: HP, Armor, Evasion, Stress, Hope with modifier support",
      "Equipment slots: Primary Weapon, Secondary Weapon, Armor (linked to inventory)",
      "Backpack for additional items and consumables",
      "Domain Cards system with Domain Vault for archiving/restoring cards",
      "Custom cards with inline editing of title, content, and category",
      "Experiences section for tracking character milestones",
      "Physical description and bio editing",
      "Short Rest and Long Rest actions (downtime-based)",
      "Level-up system with multiclass support and proficiency tracking",
      "Edit/View mode toggle",
      "Admin impersonation support",
    ],
  },
  {
    name: "Sending Stone",
    description: "25-Word Messages",
    color: "border-cyan-500/50",
    features: [
      "1-on-1 direct messaging between characters",
      "Group conversations with named group stones",
      "25-word message limit per cast",
      "Message editing and deletion",
      "Unread message count badges",
      "Auto-creation of Rol'dex contacts when creating group chats",
      "Add/remove members from group chats",
      "Rename group conversations",
      "Real-time message loading and read receipts",
      "Avatar viewing in conversations",
      "Deep-linking to specific conversations via URL params",
    ],
  },
  {
    name: "App of Holding",
    description: "Inventory & Funds",
    color: "border-yellow-500/50",
    features: [
      "Credit balance display with Hex currency denominations",
      "Send money to other characters",
      "Bill payment system with batch pay and overdraft protection (up to 1 Bag / 600 Hex)",
      "Transaction history with expandable list",
      "Inventory management: add custom items with tier, category, and specifications",
      "Add items from store catalog (pre-populated fields)",
      "Item deletion with linked subscription cleanup",
      "Recurring payments / subscriptions overview",
      "Income tracking for full-time employment",
      "Downtime balance display",
      "Asset value calculation",
      "Category-colored inventory cards (weapon, armor, cybernetic, consumable, etc.)",
    ],
  },
  {
    name: "@tunes",
    description: "Attunement & Subscriptions",
    color: "border-gray-500/50",
    features: [
      "View all active, paused, manual, and cancelled subscriptions",
      "Summary dashboard: total subs, active count, paused count, total owed",
      "Change subscription status: Active ↔ Manual, Pause, Cancel",
      "Manual payment for accumulated charges",
      "Pay remaining debt on cancelled subscriptions",
      "Interval display (daily, weekly, monthly, yearly)",
      "Company/payer identification with player-posted job support",
      "Tier badges and charge history tracking",
    ],
  },
  {
    name: "CVNews",
    description: "News Network",
    color: "border-blue-500/50",
    features: [
      "Browse published news articles with breaking news highlighting",
      "Article detail view with full content and images",
      "Search articles by headline or content",
      "Tag-based filtering",
      "In-game date display on articles (day/month/year)",
      "Player-submitted news tips with app selection",
      "Organization-tagged articles",
    ],
  },
  {
    name: "Wyrmcart",
    description: "Shopping",
    color: "border-green-500/50",
    features: [
      "Browse shop catalog by category (Weapons, Armor, Cybernetics, Consumables, Tools, Services)",
      "Search and filter items",
      "Detailed item cards with tier, company, specs, and pricing",
      "Hex currency pricing with denomination breakdown",
      "Purchase dialog with confirmation",
      "Wishlist system: request items not in stock",
      "Sort by price, name, tier",
      "Hover cards for quick item details",
      "Subscription fees displayed alongside upfront costs",
    ],
  },
  {
    name: "ToMe",
    description: "Digital Notes",
    color: "border-indigo-500/50",
    features: [
      "Tome Entries: multi-chapter documents with markdown support",
      "Quick Notes: sticky-note style cards with color coding",
      "Pin notes and entries for quick access",
      "Tag system for organizing entries and notes",
      "Search across all entries and notes",
      "Drag-and-drop reordering of quick notes",
      "Multi-column layout for quick notes",
      "Share tome entries with other players via Rol'dex contacts",
      "Receive and accept/reject shared entries",
      "Chapter-based navigation within entries",
      "Import/export entries",
      "Markdown rendering with rich text preview",
    ],
  },
  {
    name: "Rol'dex",
    description: "Contacts",
    color: "border-blue-500/50",
    features: [
      "Browse all characters and NPCs",
      "Add/remove contacts to your personal list",
      "Personal rating system (star ratings)",
      "Contact notes and relationship labels",
      "Tag contacts for categorization",
      "Search and filter contacts (all, contacts only, NPCs)",
      "View character detail cards with stats and bio",
      "Avatar viewing",
      "Active/inactive contact status",
    ],
  },
  {
    name: "Timestop",
    description: "Calendar",
    color: "border-amber-500/50",
    features: [
      "Custom 365-day calendar: 13 months of 28 days + Day of Frippery",
      "Monthly and annual view modes",
      "Create, edit, and delete personal events",
      "Multi-day events with duration support spanning months",
      "Holiday display with expandable descriptions",
      "Share events with Rol'dex contacts",
      "Remove shared events without deleting the original",
      "Search events across all months",
      "Today button for quick navigation",
      "Short Rest, Long Rest, and Work actions directly from the calendar",
      "Downtime balance and work progress tracking",
      "Impersonation support with 'Viewing as' indicator",
    ],
  },
  {
    name: "BHoldR",
    description: "Video Feed",
    color: "border-purple-500/50",
    features: [
      "YouTube video feed with embedded player",
      "Create personal video channels",
      "Upload videos with title, description, and tags",
      "Like/dislike rating system",
      "Comment system on videos",
      "Channel management: edit and delete videos",
      "Video thumbnails auto-extracted from YouTube",
      "Relative timestamp display",
    ],
  },
  {
    name: "Suggestion",
    description: "IT Support Goblin",
    color: "border-green-500/50",
    features: [
      "Submit bug reports or feature suggestions",
      "Select related app from dropdown",
      "Attach screenshots to submissions",
      "View submission history with status tracking (open, reviewed, planned, done, dismissed)",
      "Type toggle: suggestion vs. issue",
    ],
  },
  {
    name: "Maze",
    description: "Navigation",
    color: "border-teal-500/50",
    features: [
      "Interactive map with zoom and pan",
      "View public and personal location markers",
      "Add custom locations with icon type, color, and description",
      "Area regions with polygon boundaries",
      "Area and location detail panels with environment cards",
      "Write and read area/location reviews with ratings",
      "Personal map notes per area/location",
      "Pathfinding between locations and areas",
      "Route visualization on map",
      "Relocate personal markers",
      "Location images and descriptions",
    ],
  },
  {
    name: "Questseek",
    description: "Notice Board (Open Beta)",
    color: "border-emerald-500/50",
    features: [
      "Browse available quests by category: Admin Quests, Community Jobs, Full-Time",
      "My Jobs tab showing accepted/active quests",
      "Search and difficulty filter (Low/Medium/High Risk)",
      "Apply for quests with downtime cost",
      "Submit completed work with roll results and notes",
      "Work button with progress bar for logging hours",
      "Full-time employment: application, approval, salary on payday",
      "Hour banking for full-time positions",
      "Post community/commission jobs for other players",
      "Reward display in Hex denominations (min–max range)",
      "Pagination (10 per page) with randomized order",
      "Dismiss rejected application notifications",
      "Position Filled / Not Available tags",
    ],
  },
  {
    name: "Succubus",
    description: "Social Connections (Coming Soon)",
    color: "border-red-500/50",
    features: [
      "AI-generated NPC discovery with filters (ancestry, job, community, purpose)",
      "Swipe-style profile browsing",
      "Save/dismiss generated profiles",
      "View saved profiles collection",
      "Profile details: name, ancestry, age, job, bio, compatibility score",
      "Purpose categories: Dating, Hiring, Specialist, General",
    ],
  },
  {
    name: "Cha",
    description: "Social Credit Score (Coming Soon)",
    color: "border-pink-500/50",
    features: [
      "Charisma score display",
      "Credit rating visualization",
      "Social metrics dashboard",
      "Reputation tracking",
    ],
  },
];

const FeatureList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading } = useAdmin();

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate("/");
  }, [isAdmin, isLoading, navigate]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Feature List</h1>
          <Button onClick={() => navigate("/admin")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">
          Complete feature breakdown for all {appFeatures.length} Nexus OS applications.
        </p>

        <div className="space-y-4">
          {appFeatures.map((app) => (
            <Card key={app.name} className={`border-l-4 ${app.color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>{app.name}</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {app.features.length} features
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{app.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {app.features.map((feature, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="text-primary mt-1 shrink-0">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeatureList;
