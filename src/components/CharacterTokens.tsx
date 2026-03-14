import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Download, Circle, Square, Hexagon, Coins } from 'lucide-react';
import { toast } from 'sonner';

type TokenShape = 'circle' | 'square' | 'hex';

interface Profile {
  user_id: string;
  character_name: string | null;
  character_class: string | null;
  avatar_url: string | null;
  level: number;
  ancestry: string | null;
}

const TOKEN_SIZE = 256;
const BORDER_WIDTH_DEFAULT = 6;

function drawTokenShape(
  ctx: CanvasRenderingContext2D,
  shape: TokenShape,
  size: number,
  inset: number = 0
) {
  const half = size / 2;
  const r = half - inset;

  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(half, half, r, 0, Math.PI * 2);
  } else if (shape === 'square') {
    const cornerRadius = 8;
    const x = inset, y = inset, w = size - inset * 2, h = size - inset * 2;
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + w - cornerRadius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + cornerRadius);
    ctx.lineTo(x + w, y + h - cornerRadius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - cornerRadius, y + h);
    ctx.lineTo(x + cornerRadius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
  } else {
    // Hexagon (flat-top)
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = half + r * Math.cos(angle);
      const py = half + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

async function renderToken(
  imageUrl: string,
  shape: TokenShape,
  borderWidth: number,
  borderColor: string,
  size: number = TOKEN_SIZE
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      // Clear to transparent
      ctx.clearRect(0, 0, size, size);

      // Clip to shape and draw image
      ctx.save();
      drawTokenShape(ctx, shape, size, borderWidth / 2);
      ctx.clip();

      // Draw image covering the shape area
      const imgAspect = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgAspect > 1) {
        sw = img.height;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
      ctx.restore();

      // Draw border
      if (borderWidth > 0) {
        ctx.save();
        drawTokenShape(ctx, shape, size, borderWidth / 2);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();
        ctx.restore();
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

interface TokenCardProps {
  profile: Profile;
  shape: TokenShape;
  borderWidth: number;
  borderColor: string;
}

const TokenCard = ({ profile, shape, borderWidth, borderColor }: TokenCardProps) => {
  const [tokenDataUrl, setTokenDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!profile.avatar_url) return;
    setLoading(true);
    renderToken(profile.avatar_url, shape, borderWidth, borderColor)
      .then(setTokenDataUrl)
      .catch(() => setTokenDataUrl(null))
      .finally(() => setLoading(false));
  }, [profile.avatar_url, shape, borderWidth, borderColor]);

  const handleDownload = useCallback(() => {
    if (!tokenDataUrl) return;
    const link = document.createElement('a');
    link.download = `${(profile.character_name || 'token').replace(/\s+/g, '_')}_token.png`;
    link.href = tokenDataUrl;
    link.click();
    toast.success(`Downloaded ${profile.character_name}'s token`);
  }, [tokenDataUrl, profile.character_name]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!tokenDataUrl) return;
    e.dataTransfer.setData('text/uri-list', tokenDataUrl);
    e.dataTransfer.setData('text/plain', tokenDataUrl);
    if (imgRef.current) {
      e.dataTransfer.setDragImage(imgRef.current, 48, 48);
    }
  }, [tokenDataUrl]);

  if (!profile.avatar_url) {
    return (
      <div className="flex flex-col items-center gap-2 p-3 border border-dashed rounded-lg border-muted-foreground/30">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs text-center px-2">
          No avatar
        </div>
        <span className="text-sm font-medium truncate max-w-[120px]">{profile.character_name || 'Unknown'}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      {loading ? (
        <div className="w-24 h-24 bg-muted animate-pulse rounded-full" />
      ) : tokenDataUrl ? (
        <img
          ref={imgRef}
          src={tokenDataUrl}
          alt={`${profile.character_name} token`}
          className="w-24 h-24 cursor-grab active:cursor-grabbing"
          draggable
          onDragStart={handleDragStart}
        />
      ) : (
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs">
          Error
        </div>
      )}
      <span className="text-sm font-medium truncate max-w-[120px]">{profile.character_name || 'Unknown'}</span>
      <div className="flex gap-1 flex-wrap justify-center">
        {profile.character_class && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {profile.character_class}
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          Lv.{profile.level}
        </Badge>
      </div>
      <Button size="sm" variant="ghost" onClick={handleDownload} disabled={!tokenDataUrl} className="h-7 text-xs gap-1">
        <Download className="h-3 w-3" />
        PNG
      </Button>
    </div>
  );
};

interface CharacterTokensProps {
  trigger?: React.ReactNode;
}

export const CharacterTokens = ({ trigger }: CharacterTokensProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [shape, setShape] = useState<TokenShape>('circle');
  const [borderWidth, setBorderWidth] = useState(BORDER_WIDTH_DEFAULT);
  const [borderColor, setBorderColor] = useState('#d4af37');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, character_name, character_class, avatar_url, level, ancestry')
        .order('character_name');
      setProfiles(data || []);
    };
    load();
  }, [open]);

  const classes = useMemo(() => {
    return profiles
      .map(p => p.character_class)
      .filter((c, i, a) => c && a.indexOf(c) === i)
      .sort();
  }, [profiles]);

  const filtered = useMemo(() => {
    return profiles.filter(p => {
      if (!p.avatar_url) return false;
      const matchesSearch = !searchTerm ||
        p.character_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.character_class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ancestry?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = classFilter === 'all' || p.character_class === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [profiles, searchTerm, classFilter]);

  const handleDownloadAll = useCallback(async () => {
    for (const p of filtered) {
      if (!p.avatar_url) continue;
      try {
        const dataUrl = await renderToken(p.avatar_url, shape, borderWidth, borderColor);
        const link = document.createElement('a');
        link.download = `${(p.character_name || 'token').replace(/\s+/g, '_')}_token.png`;
        link.href = dataUrl;
        link.click();
        await new Promise(r => setTimeout(r, 300));
      } catch { /* skip */ }
    }
    toast.success(`Downloaded ${filtered.length} tokens`);
  }, [filtered, shape, borderWidth, borderColor]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="h-16 flex flex-col gap-2 hover:bg-primary/10">
            <span className="font-semibold">Character Tokens</span>
            <span className="text-xs text-muted-foreground">Token Generator</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Character Tokens
          </DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="space-y-4 pb-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-1.5">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, class, ancestry..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Class filter */}
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c!} value={c!}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Border color */}
            <div className="space-y-1.5">
              <Label>Border Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={borderColor}
                  onChange={e => setBorderColor(e.target.value)}
                  className="h-10 w-14 rounded border border-input cursor-pointer"
                />
                <div className="flex flex-wrap gap-1 items-center">
                  {['#d4af37', '#c0c0c0', '#cd7f32', '#1a1a1a', '#b91c1c', '#1d4ed8'].map(c => (
                    <button
                      key={c}
                      onClick={() => setBorderColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: borderColor === c ? 'hsl(var(--primary))' : 'transparent',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            {/* Shape toggle */}
            <div className="space-y-1.5">
              <Label>Shape</Label>
              <ToggleGroup type="single" value={shape} onValueChange={v => v && setShape(v as TokenShape)}>
                <ToggleGroupItem value="circle" aria-label="Circle">
                  <Circle className="h-4 w-4 mr-1" /> Circle
                </ToggleGroupItem>
                <ToggleGroupItem value="square" aria-label="Square">
                  <Square className="h-4 w-4 mr-1" /> Square
                </ToggleGroupItem>
                <ToggleGroupItem value="hex" aria-label="Hexagon">
                  <Hexagon className="h-4 w-4 mr-1" /> Hex
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Border width */}
            <div className="space-y-1.5 min-w-[140px]">
              <Label>Border Width: {borderWidth}px</Label>
              <Slider
                value={[borderWidth]}
                onValueChange={v => setBorderWidth(v[0])}
                min={0}
                max={16}
                step={1}
              />
            </div>

            {/* Download all */}
            <Button onClick={handleDownloadAll} variant="outline" size="sm" className="gap-1">
              <Download className="h-4 w-4" />
              Download All ({filtered.length})
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Drag tokens directly onto Roll20, Foundry VTT, or other VTT platforms. Tokens export as transparent PNGs.
          </p>
        </div>

        {/* Token grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-4">
          {filtered.map(p => (
            <TokenCard
              key={p.user_id}
              profile={p}
              shape={shape}
              borderWidth={borderWidth}
              borderColor={borderColor}
            />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">
              No characters with avatars match the filters
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
