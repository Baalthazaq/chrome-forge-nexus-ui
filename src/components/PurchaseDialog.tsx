import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { formatHex, formatHexDenomination, getHexBreakdown } from "@/lib/currency";
import { AlertTriangle, ShoppingCart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    name: string;
    type: string;
    tier: number;
    priceUpfront: number;
    priceSub: number;
    company: string;
    description: string;
  } | null;
  userBalance: number;
  onPurchaseComplete: () => void;
  targetUserId?: string;
}

export function PurchaseDialog({
  open,
  onOpenChange,
  item,
  userBalance,
  onPurchaseComplete,
  targetUserId,
}: PurchaseDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!item) return null;

  const totalUpfront = item.priceUpfront;
  const newBalance = userBalance - totalUpfront;
  const isOverdraft = newBalance < 0 && userBalance >= 0;
  const wouldExceedLimit = newBalance < -6000;
  const balanceInfo = getHexBreakdown(userBalance);
  const newBalanceInfo = getHexBreakdown(newBalance);

  async function handlePurchase() {
    if (!item) return;
    setLoading(true);

    try {
      // Find the matching shop_item in the database by name
      const { data: shopItem, error: findError } = await supabase
        .from("shop_items")
        .select("id")
        .eq("name", item.name)
        .eq("is_active", true)
        .maybeSingle();

      if (findError) throw findError;

      if (!shopItem) {
        toast({
          title: "Item Unavailable",
          description: "This item is not currently available for purchase.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Call the shop-operations edge function
      const { data, error } = await supabase.functions.invoke("shop-operations", {
        body: {
          operation: "purchase_item",
          itemId: shopItem.id,
          quantity: 1,
          ...(targetUserId ? { targetUserId } : {}),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Purchase Complete",
        description: `You acquired ${item.name}!${data?.subscriptionCreated ? ` A daily subscription of ${formatHexDenomination(item.priceSub)} has been created.` : ""}`,
      });

      onPurchaseComplete();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Purchase Failed",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-gray-700 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-green-400">
            <ShoppingCart className="w-5 h-5" />
            Confirm Purchase
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              {/* Item info */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <p className="text-white font-medium">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                    {item.type}
                  </Badge>
                  <span className="text-xs text-gray-400">Tier {item.tier}</span>
                  <span className="text-xs text-gray-400">— {item.company}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">{item.description}</p>
              </div>

              {/* Cost breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Upfront Cost</span>
                  <span className="text-green-400 font-medium">
                    ⏣{totalUpfront} ({formatHexDenomination(totalUpfront)})
                  </span>
                </div>
                {item.priceSub > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Daily Subscription</span>
                    <span className="text-yellow-400 font-medium">
                      ⏣{item.priceSub}/day ({formatHexDenomination(item.priceSub)}/day)
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-2 flex justify-between">
                  <span className="text-gray-300">Current Balance</span>
                  <span className={balanceInfo.colorClass}>
                    ⏣{userBalance} ({balanceInfo.breakdown})
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-white">After Purchase</span>
                  <span className={newBalanceInfo.colorClass}>
                    ⏣{newBalance} ({newBalanceInfo.breakdown})
                  </span>
                </div>
              </div>

              {/* Overdraft warning */}
              {isOverdraft && !wouldExceedLimit && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300">
                    This purchase will put you into overdraft. Your balance will be negative.
                  </p>
                </div>
              )}

              {/* Exceeds limit */}
              {wouldExceedLimit && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">
                    This purchase would exceed your overdraft limit of ⏣6000 (1 Bag). Transaction blocked.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-gray-700 text-muted-foreground hover:bg-gray-800">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handlePurchase();
            }}
            disabled={wouldExceedLimit || loading}
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ShoppingCart className="w-4 h-4 mr-2" />
            )}
            {loading ? "Processing..." : "Confirm Purchase"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
