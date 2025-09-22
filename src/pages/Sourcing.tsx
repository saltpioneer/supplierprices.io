import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, ListChecks, MessageSquare } from "lucide-react";

type DocType = "RFI" | "RFQ" | "RFP";

export default function Sourcing() {
  const [docType, setDocType] = useState<DocType>("RFI");
  const [projectName, setProjectName] = useState("");
  const [scope, setScope] = useState("");
  const [requirements, setRequirements] = useState("");
  const [timeline, setTimeline] = useState("");
  const [deliverables, setDeliverables] = useState("");

  const generated = useMemo(() => {
    const header = `${docType} - ${projectName || "Untitled Project"}`;
    const sections = [
      { title: "Scope of Work", body: scope || "Describe the high-level scope." },
      { title: docType === "RFI" ? "Information Requested" : "Requirements", body: requirements || "List specifications, standards, or questions." },
      { title: docType === "RFQ" ? "Bill of Quantities" : "Deliverables", body: deliverables || (docType === "RFP" ? "Expected outputs, milestones, and documentation." : "") },
      { title: "Timeline", body: timeline || "Key dates: submission deadline, Q&A window, delivery." },
      { title: "Submission", body: "Include company profile, references, and relevant certifications." },
    ];
    return [`# ${header}`, ...sections.map(s => `## ${s.title}\n${s.body}`)].join("\n\n");
  }, [docType, projectName, scope, requirements, timeline, deliverables]);

  const download = () => {
    const blob = new Blob([generated], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType}-${(projectName || "Untitled").replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sourcing Documents</h1>
        <p className="text-muted-foreground">Generate RFI, RFQ, and RFP from a single SOW</p>
      </div>

      <Tabs defaultValue="RFI" onValueChange={(v) => setDocType(v as DocType)}>
        <TabsList>
          <TabsTrigger value="RFI"><MessageSquare className="h-4 w-4 mr-1" /> RFI</TabsTrigger>
          <TabsTrigger value="RFQ"><ListChecks className="h-4 w-4 mr-1" /> RFQ</TabsTrigger>
          <TabsTrigger value="RFP"><FileText className="h-4 w-4 mr-1" /> RFP</TabsTrigger>
        </TabsList>

        <TabsContent value="RFI">
          <GeneratorForm
            projectName={projectName} setProjectName={setProjectName}
            scope={scope} setScope={setScope}
            requirements={requirements} setRequirements={setRequirements}
            timeline={timeline} setTimeline={setTimeline}
            deliverables={deliverables} setDeliverables={setDeliverables}
            generated={generated} onDownload={download}
          />
        </TabsContent>

        <TabsContent value="RFQ">
          <GeneratorForm
            projectName={projectName} setProjectName={setProjectName}
            scope={scope} setScope={setScope}
            requirements={requirements} setRequirements={setRequirements}
            timeline={timeline} setTimeline={setTimeline}
            deliverables={deliverables} setDeliverables={setDeliverables}
            generated={generated} onDownload={download}
          />
        </TabsContent>

        <TabsContent value="RFP">
          <GeneratorForm
            projectName={projectName} setProjectName={setProjectName}
            scope={scope} setScope={setScope}
            requirements={requirements} setRequirements={setRequirements}
            timeline={timeline} setTimeline={setTimeline}
            deliverables={deliverables} setDeliverables={setDeliverables}
            generated={generated} onDownload={download}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneratorForm(props: {
  projectName: string; setProjectName: (v: string) => void;
  scope: string; setScope: (v: string) => void;
  requirements: string; setRequirements: (v: string) => void;
  timeline: string; setTimeline: (v: string) => void;
  deliverables: string; setDeliverables: (v: string) => void;
  generated: string; onDownload: () => void;
}) {
  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Statement of Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Project Name</Label>
            <Input placeholder="Data Center Expansion" value={props.projectName} onChange={e => props.setProjectName(e.target.value)} />
          </div>
          <div>
            <Label>Scope</Label>
            <Textarea rows={4} placeholder="Describe the project scope" value={props.scope} onChange={e => props.setScope(e.target.value)} />
          </div>
          <div>
            <Label>Requirements</Label>
            <Textarea rows={4} placeholder="Specs, compliance, questions" value={props.requirements} onChange={e => props.setRequirements(e.target.value)} />
          </div>
          <div>
            <Label>Deliverables / BOQ</Label>
            <Textarea rows={3} placeholder="Outputs or bill of quantities" value={props.deliverables} onChange={e => props.setDeliverables(e.target.value)} />
          </div>
          <div>
            <Label>Timeline</Label>
            <Textarea rows={2} placeholder="Deadlines and milestones" value={props.timeline} onChange={e => props.setTimeline(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={props.onDownload}><Download className="h-4 w-4 mr-2" /> Download Markdown</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-6">
            {props.generated}
          </div>
          <Separator className="my-4" />
          <div className="text-xs text-muted-foreground">
            Tip: You can paste this into an email or export to your doc tool.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


