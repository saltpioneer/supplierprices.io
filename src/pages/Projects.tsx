import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getProjects } from "@/lib/storage";

export default function Projects() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(() => getProjects());
  useEffect(() => setRows(getProjects()), []);

  const filtered = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Project portfolio overview</p>
        </div>
        <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.startDate || "-"} → {p.endDate || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


