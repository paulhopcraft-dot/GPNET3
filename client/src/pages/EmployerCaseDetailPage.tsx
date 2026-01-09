import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { fetchWithCsrf } from "@/lib/queryClient";
import type { WorkerCase, PaginatedCasesResponse } from "@shared/schema";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TimelineCard } from "@/components/TimelineCard";

export default function EmployerCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Fetch case data
  const { data: paginatedData } = useQuery<PaginatedCasesResponse>({
    queryKey: ["/api/gpnet2/cases"],
  });
  const workerCase = paginatedData?.cases?.find(c => c.id === id);

  const generateSummary = async () => {
    if (!id) return;
    setLoadingSummary(true);
    try {
      const response = await fetchWithCsrf(`/api/cases/${id}/summary`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary);
      }
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const renderMarkdown = (content: string) => (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );

  if (!workerCase) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading case details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-8 w-px bg-border" />
            <div>
              <h1 className="text-2xl font-bold">{workerCase.workerName}</h1>
              <p className="text-sm text-muted-foreground">
                {workerCase.company} • Injury Date: {workerCase.dateOfInjury}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-100 text-emerald-800">
              At work
            </Badge>
            <Badge variant="outline" className="border-emerald-300 text-emerald-700">
              Compliance: Very High
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs at the top */}
      <Tabs defaultValue="summary" className="flex-1 flex flex-col">
        <div className="border-b bg-card px-6 py-2">
          <TabsList className="grid grid-cols-8 h-12">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="injury">Injury</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="recovery">Recovery</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="summary" className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Status Summary - Andres Fabian Gutierrez Nieto (Claim 08240066969)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Claim Status */}
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Claim Status</h3>
                <p className="text-sm">FINALISED (closed for weekly payments as of 08/12/2025)</p>
              </div>

              {/* Employment Status */}
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Employment Status</h3>
                <p className="text-sm">Full-time cleaner at IKON Services, Mon-Fri 8am-4pm (37 hrs/week), commenced 08/12/2025</p>
              </div>

              {/* Medical Status */}
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Medical Status</h3>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• No active Certificate of Capacity in place</li>
                  <li>• No insurer-imposed restrictions</li>
                  <li>• Experiencing intermittent symptoms (finger stiffness/locking, worse in cold weather, rated ~4/10)</li>
                  <li>• Continuing physiotherapy (Saturday appointments)</li>
                  <li>• No formal clearance certificate obtained yet</li>
                </ul>
              </div>

              {/* Key Outstanding Items */}
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Key Outstanding Items</h3>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• <strong>Clearance certificate</strong> - Andres has physio appointment Saturday; GPNet has asked him to discuss whether formal clearance is appropriate</li>
                  <li>• <strong>Wage top-up</strong> - Saurav confirmed Symmetry will top up if earnings fall below $1,074/week. Andres queried $238 shortfall for his first fortnight (earned $1,910 vs $2,148 entitlement)</li>
                  <li>• <strong>3-month stability period</strong> - DXC advised claim considered "stable" after ~3 months sustained employment (target: early March 2026)</li>
                </ul>
              </div>

              {/* Risk Factors */}
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Risk Factors</h3>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Andres reports ongoing mild symptoms (stiffness, occasional locking) though managing duties</li>
                  <li>• If employment ends due to accepted injury, claim may be reopened</li>
                  <li>• Long commute (2 trains, 1 bus, 25-min walk) noted as challenging</li>
                </ul>
              </div>

              {/* Next Actions */}
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Next Actions</h3>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Follow up with Andres after Saturday physio re: clearance certificate</li>
                  <li>• Continue light-touch welfare monitoring</li>
                  <li>• Saurav to process wage top-up based on payslips received</li>
                </ul>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="injury" className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Injury Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">Injury</div>
                  <div className="text-sm flex-1">Soft tissue injury - palmar tenosynovitis/trigger finger (3rd & 4th digits, right hand)</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">Date of Onset</div>
                  <div className="text-sm flex-1">~December 2024 (reported 17 March 2025)</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">Mechanism</div>
                  <div className="text-sm flex-1">Repetitive use of vibration cutting machine</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">Treating GP</div>
                  <div className="text-sm flex-1">Dr. Caesar Tan</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">Physiotherapist</div>
                  <div className="text-sm flex-1">Andrew Coulter (Hobsons Bay Medical)</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-40 text-sm font-medium">ORP</div>
                  <div className="text-sm flex-1">Jordan Pankiw (AMS Consulting)</div>
                </div>
                <div className="flex pb-2">
                  <div className="w-40 text-sm font-medium">Case Manager</div>
                  <div className="text-sm flex-1">Niko Datuin (DXC)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="flex-1 p-6">
          <TimelineCard caseId={id!} />
        </TabsContent>

        <TabsContent value="status" className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Status (as at 8 January 2026)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Claim Status</div>
                  <div className="text-sm flex-1">Finalised/Closed for weekly payments</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Employment</div>
                  <div className="text-sm flex-1">Full-time cleaner at IKON Services</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Hours</div>
                  <div className="text-sm flex-1">Mon-Fri, 8am-4pm (37 hrs/week)</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Current Rate</div>
                  <div className="text-sm flex-1">$32.31/hr (casual loading incl.) = $1,211.62/week</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Certificate of Capacity</div>
                  <div className="text-sm flex-1">None current (expired)</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Restrictions</div>
                  <div className="text-sm flex-1">None imposed by insurer</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Symptoms</div>
                  <div className="text-sm flex-1">Intermittent - finger stiffness/locking in cold weather (~4/10), improving during day</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Treatment</div>
                  <div className="text-sm flex-1">Ongoing physio (Saturday appointments)</div>
                </div>
                <div className="flex pb-2">
                  <div className="w-48 text-sm font-medium">Wage Entitlement</div>
                  <div className="text-sm flex-1">$1,074/week (PIAWE after step-down)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Pre-injury weekly earnings</div>
                  <div className="text-sm flex-1">$1,346.63</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Current weekly earnings (IKON)</div>
                  <div className="text-sm flex-1">$1,211.62</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Weekly shortfall</div>
                  <div className="text-sm flex-1">$135.01</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">PIAWE entitlement</div>
                  <div className="text-sm flex-1">$1,074/week</div>
                </div>
                <div className="flex pb-2">
                  <div className="w-48 text-sm font-medium">Top-up required if below PIAWE</div>
                  <div className="text-sm flex-1">Yes - Symmetry to pay difference</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Register</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 p-2 bg-gray-50 rounded text-sm font-medium">
                  <div>Risk</div>
                  <div>Likelihood</div>
                  <div>Impact</div>
                  <div>Mitigation</div>
                </div>
                <div className="grid grid-cols-4 gap-4 p-2 border-b text-sm">
                  <div>Symptom exacerbation leading to claim reopening</div>
                  <div><span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">Medium</span></div>
                  <div><span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">High</span></div>
                  <div>Welfare monitoring, physio continuation</div>
                </div>
                <div className="grid grid-cols-4 gap-4 p-2 border-b text-sm">
                  <div>Worker disengages from new role (long commute, difficult manager)</div>
                  <div><span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">Medium</span></div>
                  <div><span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">High</span></div>
                  <div>Regular check-ins, early intervention</div>
                </div>
                <div className="grid grid-cols-4 gap-4 p-2 border-b text-sm">
                  <div>No formal clearance obtained</div>
                  <div><span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">Medium</span></div>
                  <div><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Low</span></div>
                  <div>Request clearance from physio/GP</div>
                </div>
                <div className="grid grid-cols-4 gap-4 p-2 text-sm">
                  <div>Employer liability if employment ends due to injury</div>
                  <div><span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Low</span></div>
                  <div><span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">High</span></div>
                  <div>Monitor 3-month stability period</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Worker Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person</span>
                  Worker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{workerCase.workerName}</p>
                <p className="text-sm text-muted-foreground mt-1">{workerCase.company}</p>
              </CardContent>
            </Card>

            {/* Case Owner Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">assignment_ind</span>
                  Case Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{workerCase.owner || "Unassigned"}</p>
                <p className="text-sm text-muted-foreground mt-1">Case Manager</p>
              </CardContent>
            </Card>

            {/* Employer Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">business</span>
                  Employer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{workerCase.company}</p>
                <p className="text-sm text-muted-foreground mt-1">Host Employer</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardContent className="py-6">
              <div className="text-center text-muted-foreground">
                <span className="material-symbols-outlined text-3xl mb-2">contact_page</span>
                <p className="text-sm">
                  Additional contact details are available through your case management system.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Planning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Recovery plan will be displayed here</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}