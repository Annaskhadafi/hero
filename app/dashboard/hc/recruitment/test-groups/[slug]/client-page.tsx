"use client";

import { AdminPageShell } from "@/components/admin-page-shell";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconExternalLink, IconArrowLeft } from "@tabler/icons-react";

interface Props {
  group: any;
  testHeaders: any[];
  entries: any[];
}

export function TestGroupResultsClientPage({ group, testHeaders, entries }: Props) {
  return (
    <AdminPageShell
      eyebrow="Recruitment"
      title={`Results: ${group.name}`}
      description={group.description}
    >
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/dashboard/hc/recruitment/tests">
            <IconArrowLeft className="w-4 h-4" /> Back to Online Tests
          </Link>
        </Button>
      </div>

      <MinimalTableShell label="group entries" title={`Candidate Results for ${group.name}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CANDIDATE</TableHead>
              <TableHead>PROGRESS</TableHead>
              <TableHead>TOTAL SCORE</TableHead>
              {testHeaders.map(th => (
                <TableHead key={th.testId} className="whitespace-nowrap">{th.title}</TableHead>
              ))}
              <TableHead className="text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.candidateId}>
                <TableCell>
                  <div className="font-medium">{entry.fullName}</div>
                  <div className="text-xs text-muted-foreground">{entry.email}</div>
                  <div className="text-xs text-muted-foreground">{entry.phone}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={entry.testsCompleted === testHeaders.length ? "default" : "secondary"}>
                    {entry.progressText}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold">
                  {entry.totalScore}
                </TableCell>
                
                {testHeaders.map(th => {
                  const testData = entry.tests[th.testId];
                  if (!testData) return <TableCell key={th.testId} className="text-muted-foreground text-xs">Not Started</TableCell>;
                  
                  return (
                    <TableCell key={th.testId}>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium">{testData.status}</span>
                        {th.isApplicationForm ? null : (
                          <span className="text-sm">{testData.score} pts</span>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
                
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild className="gap-1">
                    {/* Link to the specific test detail pages for this candidate's answers */}
                    <Link href={`/dashboard/hc/recruitment/tests/${testHeaders[0]?.testId}`}>
                      View Details <IconExternalLink className="w-4 h-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4 + testHeaders.length} className="text-center h-24 text-muted-foreground">
                  No candidates have started this test group yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </MinimalTableShell>
    </AdminPageShell>
  );
}
