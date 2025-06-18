
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet, Package, TrendingUp, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

const Vault = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-black to-orange-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Vault
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/30">
            <div className="flex items-center space-x-4">
              <CreditCard className="w-12 h-12 text-yellow-400" />
              <div>
                <div className="text-yellow-400 text-sm">Digital Currency</div>
                <div className="text-3xl font-bold text-white">₢ 247,853</div>
                <div className="text-green-400 text-sm flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12.3% this month
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-4">
              <Wallet className="w-12 h-12 text-blue-400" />
              <div>
                <div className="text-blue-400 text-sm">Physical Assets</div>
                <div className="text-3xl font-bold text-white">₢ 89,420</div>
                <div className="text-gray-400 text-sm">Market estimated</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Inventory Grid */}
        <Card className="p-6 bg-gray-900/30 border-gray-700/50 mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Package className="w-6 h-6 text-white" />
            <h3 className="text-xl font-semibold text-white">Inventory</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: "Neural Interface", quantity: 1, rarity: "legendary", value: "₢ 45,000" },
              { name: "Plasma Rifle", quantity: 1, rarity: "rare", value: "₢ 12,500" },
              { name: "Med Stims", quantity: 23, rarity: "common", value: "₢ 690" },
              { name: "Data Shards", quantity: 47, rarity: "uncommon", value: "₢ 2,350" },
              { name: "Cyber Deck", quantity: 2, rarity: "epic", value: "₢ 28,000" },
              { name: "Memory Chips", quantity: 156, rarity: "common", value: "₢ 780" },
              { name: "Holo Projector", quantity: 1, rarity: "rare", value: "₢ 8,200" },
              { name: "Energy Cells", quantity: 89, rarity: "common", value: "₢ 445" },
            ].map((item, index) => {
              const rarityColors = {
                common: "border-gray-500 bg-gray-800/50",
                uncommon: "border-green-500 bg-green-900/20",
                rare: "border-blue-500 bg-blue-900/20",
                epic: "border-purple-500 bg-purple-900/20",
                legendary: "border-yellow-500 bg-yellow-900/20"
              };

              return (
                <div key={index} className={`p-3 rounded-lg border ${rarityColors[item.rarity as keyof typeof rarityColors]}`}>
                  <div className="text-white font-semibold text-sm mb-1">{item.name}</div>
                  <div className="text-gray-400 text-xs mb-2">Qty: {item.quantity}</div>
                  <div className="text-yellow-400 text-xs font-mono">{item.value}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card className="p-6 bg-gray-900/30 border-gray-700/50">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {[
              { type: "income", description: "Quest Completion: Data Recovery", amount: "+₢ 15,000", time: "2 hours ago" },
              { type: "expense", description: "Neural Interface Upgrade", amount: "-₢ 8,500", time: "1 day ago" },
              { type: "income", description: "Asset Sale: Vintage Tech", amount: "+₢ 3,200", time: "2 days ago" },
              { type: "expense", description: "Ammunition Resupply", amount: "-₢ 450", time: "3 days ago" },
              { type: "income", description: "Bounty Payment", amount: "+₢ 22,000", time: "5 days ago" },
            ].map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="text-white text-sm">{transaction.description}</div>
                  <div className="text-gray-400 text-xs">{transaction.time}</div>
                </div>
                <div className={`font-mono text-sm ${
                  transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {transaction.amount}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Vault;
