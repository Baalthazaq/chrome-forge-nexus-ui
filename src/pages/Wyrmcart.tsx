
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, ShoppingCart, Star, Zap, Shield, Cpu } from "lucide-react";
import { Link } from "react-router-dom";

const Wyrmcart = () => {
  const categories = [
    { name: "Cybernetics", icon: Cpu, color: "text-blue-400" },
    { name: "Combat Gear", icon: Shield, color: "text-red-400" },
    { name: "Tech", icon: Zap, color: "text-yellow-400" },
  ];

  const featuredItems = [
    {
      id: 1,
      name: "Neural Interface Mk-VII",
      price: "₢ 45,000",
      rating: 4.8,
      category: "Cybernetics",
      image: "🧠",
      description: "Military-grade neural interface with quantum encryption",
      inStock: 3
    },
    {
      id: 2,
      name: "Plasma Katana",
      price: "₢ 28,500",
      rating: 4.9,
      category: "Combat Gear", 
      image: "⚔️",
      description: "Mono-molecular blade with plasma edge enhancement",
      inStock: 1
    },
    {
      id: 3,
      name: "Holographic Projector",
      price: "₢ 12,000",
      rating: 4.6,
      category: "Tech",
      image: "🔮",
      description: "Portable holo-display with AR integration",
      inStock: 7
    },
    {
      id: 4,
      name: "Stealth Cloak Gen-3",
      price: "₢ 67,000",
      rating: 4.7,
      category: "Tech",
      image: "👻",
      description: "Active camouflage with thermal masking",
      inStock: 0
    }
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-black to-emerald-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Wyrmcart
          </h1>
          <Button variant="ghost" className="text-green-400">
            <ShoppingCart className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <Card className="p-4 bg-gray-900/50 border-green-500/30 mb-6">
          <div className="flex items-center space-x-4">
            <Search className="w-5 h-5 text-green-400" />
            <input 
              placeholder="Search black market inventory..."
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none"
            />
          </div>
        </Card>

        {/* Categories */}
        <div className="flex space-x-4 mb-8">
          {categories.map((category, index) => (
            <Button key={index} variant="outline" className="border-green-600 text-green-400 hover:bg-green-900/20">
              <category.icon className={`w-4 h-4 mr-2 ${category.color}`} />
              {category.name}
            </Button>
          ))}
        </div>

        {/* Featured Items */}
        <h2 className="text-xl font-semibold text-white mb-6">Black Market Specials</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuredItems.map((item) => (
            <Card key={item.id} className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-green-500/50 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{item.image}</div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">{item.price}</div>
                  <div className="flex items-center space-x-1 text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm">{item.rating}</span>
                  </div>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">{item.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{item.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="border-green-600 text-green-400">
                    {item.category}
                  </Badge>
                  <Badge variant={item.inStock > 0 ? "default" : "destructive"}>
                    {item.inStock > 0 ? `${item.inStock} in stock` : "Out of Stock"}
                  </Badge>
                </div>
                <Button 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  disabled={item.inStock === 0}
                >
                  {item.inStock > 0 ? "Add to Cart" : "Notify Me"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Account Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-green-400">₢ 125,840</div>
            <div className="text-gray-400 text-sm">Wallet Balance</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-blue-400">47</div>
            <div className="text-gray-400 text-sm">Total Orders</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-yellow-400">4.9</div>
            <div className="text-gray-400 text-sm">Vendor Rating</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-purple-400">VIP</div>
            <div className="text-gray-400 text-sm">Member Status</div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Wyrmcart;
