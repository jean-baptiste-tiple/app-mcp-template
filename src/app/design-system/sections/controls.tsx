import { Envelope, Plus } from "@phosphor-icons/react/dist/ssr"

import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Section } from "./section"

export function ButtonsSection() {
  return (
    <Section title="Buttons">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Ajouter">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled>Disabled</Button>
        <Button>
          <Envelope className="mr-2 h-4 w-4" aria-hidden="true" />
          Avec icône
        </Button>
      </div>
      <h3 className="mt-6 text-sm font-medium text-muted-foreground">Copier (CopyButton)</h3>
      <div className="flex flex-wrap items-center gap-3">
        <CopyButton value="pnpm install" label="Copier la commande" />
        <CopyButton value="https://exemple.fr/api/mcp" size="icon" />
      </div>
    </Section>
  )
}

export function BadgesSection() {
  return (
    <Section title="Badges">
      <div className="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
      </div>
    </Section>
  )
}

export function FormsSection() {
  return (
    <Section title="Formulaires">
      <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="input-demo">Input</Label>
          <Input id="input-demo" placeholder="Entrez du texte..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="input-disabled">Input disabled</Label>
          <Input id="input-disabled" placeholder="Disabled..." disabled />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="textarea-demo">Textarea</Label>
          <Textarea id="textarea-demo" placeholder="Entrez votre message..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="select-demo">Select</Label>
          <Select>
            <SelectTrigger id="select-demo">
              <SelectValue placeholder="Choisir une option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option-1">Option 1</SelectItem>
              <SelectItem value="option-2">Option 2</SelectItem>
              <SelectItem value="option-3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="check-demo" />
            <Label htmlFor="check-demo">Checkbox</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="switch-demo" />
            <Label htmlFor="switch-demo">Switch</Label>
          </div>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label id="radio-demo-label">Radio Group</Label>
          <RadioGroup defaultValue="r1" aria-labelledby="radio-demo-label" className="flex gap-4">
            {[
              { v: "r1", l: "Option A" },
              { v: "r2", l: "Option B" },
              { v: "r3", l: "Option C" },
            ].map((o) => (
              <div key={o.v} className="flex items-center space-x-2">
                <RadioGroupItem value={o.v} id={o.v} />
                <Label htmlFor={o.v}>{o.l}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>
    </Section>
  )
}
