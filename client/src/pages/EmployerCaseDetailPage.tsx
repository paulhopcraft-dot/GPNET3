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
          <TabsList className="grid grid-cols-7 h-12">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="injury">Injury</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="recovery">Recovery</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="summary" className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2">
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

                  {/* Detailed Status Information */}
                  <div className="border-t pt-4 mt-6">
                    <h3 className="text-sm font-semibold text-primary mb-3">Detailed Status (as at 8 January 2026)</h3>
                    <div className="space-y-2">
                      <div className="flex border-b pb-1">
                        <div className="w-44 text-xs font-medium text-muted-foreground">Current Rate</div>
                        <div className="text-xs flex-1">$32.31/hr (casual loading incl.) = $1,211.62/week</div>
                      </div>
                      <div className="flex border-b pb-1">
                        <div className="w-44 text-xs font-medium text-muted-foreground">Certificate of Capacity</div>
                        <div className="text-xs flex-1">None current (expired)</div>
                      </div>
                      <div className="flex border-b pb-1">
                        <div className="w-44 text-xs font-medium text-muted-foreground">Restrictions</div>
                        <div className="text-xs flex-1">None imposed by insurer</div>
                      </div>
                      <div className="flex border-b pb-1">
                        <div className="w-44 text-xs font-medium text-muted-foreground">Current Symptoms</div>
                        <div className="text-xs flex-1">Intermittent - finger stiffness/locking in cold weather (~4/10), improving during day</div>
                      </div>
                      <div className="flex border-b pb-1">
                        <div className="w-44 text-xs font-medium text-muted-foreground">Treatment</div>
                        <div className="text-xs flex-1">Ongoing physio (Saturday appointments)</div>
                      </div>
                      <div className="flex pb-1">
                        <div className="w-44 text-xs font-medium text-muted-foreground">Wage Entitlement</div>
                        <div className="text-xs flex-1">$1,074/week (PIAWE after step-down)</div>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Action Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary">Immediate Actions (This Week)</h3>
                      <ul className="text-sm space-y-2 ml-3">
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Follow up with Andres after Saturday physio appointment re: clearance certificate</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Request Andres provide written update on symptom status post-physio</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Confirm with Saurav whether $238 wage top-up has been processed for first fortnight</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Request copy of Andres' first payslip for records if not already received</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary">Short-Term Actions (Next 2 Weeks)</h3>
                      <ul className="text-sm space-y-2 ml-3">
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Conduct welfare check-in with Andres (week commencing 13 Jan)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>If symptoms stable, request GP/physio issue formal clearance certificate</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Confirm Andres has attended physio appointment and document feedback</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Liaise with Saurav re: ongoing wage top-up process and payslip submissions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Update DXC if any concerns arise or if clearance certificate obtained</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary">Medium-Term Actions (Jan-Feb 2026)</h3>
                      <ul className="text-sm space-y-2 ml-3">
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Continue fortnightly welfare monitoring until 3-month stability period reached</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Track symptom reports - escalate to DXC if deterioration reported</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Ensure Andres continues physio until discharged by treating practitioner</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Document all welfare contacts and symptom updates in ticket</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Prepare for 3-month review (due ~8 March 2026)</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary">Milestone: 3-Month Stability Review (Target: 8 March 2026)</h3>
                      <ul className="text-sm space-y-2 ml-3">
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Confirm Andres has sustained employment for 3 months</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Obtain final clearance certificate if not already provided</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Confirm with DXC claim is considered stable</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Close active monitoring if no ongoing concerns</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <input type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5" />
                          <span>Final update to Symmetry confirming case closure</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
                <div className="grid grid-cols-4 gap-4 p-2 border-b-2 border-primary text-sm font-semibold text-primary">
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
          <Card>
            <CardHeader>
              <CardTitle>Key Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Role</div>
                  <div className="w-48 text-sm font-medium">Name</div>
                  <div className="text-sm font-medium flex-1">Contact</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Worker</div>
                  <div className="w-48 text-sm">Andres Gutierrez</div>
                  <div className="text-sm flex-1">andresgutini77@gmail.com / 0473 208 394</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Employer Contact</div>
                  <div className="w-48 text-sm">Saurav Kansakar (CFO)</div>
                  <div className="text-sm flex-1">SauravK@symmetryhr.com.au / 03 9566 2416</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Employer Contact</div>
                  <div className="w-48 text-sm">Michelle Clarkson</div>
                  <div className="text-sm flex-1">MichelleC@symmetryhr.com.au</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">DXC Case Manager</div>
                  <div className="w-48 text-sm">Niko Datuin</div>
                  <div className="text-sm flex-1">lorenznikolay.datuin@dxc.com / 03 9947 6289</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">ORP</div>
                  <div className="w-48 text-sm">Jordan Pankiw (AMS)</div>
                  <div className="text-sm flex-1">jpankiw@amsconsulting.com.au / 0412 251 372</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">Physio</div>
                  <div className="w-48 text-sm">Andrew Coulter</div>
                  <div className="text-sm flex-1">Hobsons Bay Medical</div>
                </div>
                <div className="flex border-b pb-2">
                  <div className="w-48 text-sm font-medium">GP</div>
                  <div className="w-48 text-sm">Dr. Caesar Tan</div>
                  <div className="text-sm flex-1">-</div>
                </div>
                <div className="flex pb-2">
                  <div className="w-48 text-sm font-medium">GPNet Contact</div>
                  <div className="w-48 text-sm">Jacinta Bailey</div>
                  <div className="text-sm flex-1">jacinta.bailey@gpnet.au</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="flex-1 p-6">
          <div className="space-y-6">
            {/* Recovery Timeline Header */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">timeline</span>
                  Recovery Planning Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="text-sm text-muted-foreground mb-2">Injury Date: March 19, 2025 → Current Status: Return to Work Achieved</div>
                  <div className="text-sm font-medium text-emerald-600">Duration: 9 months, 2 weeks</div>
                </div>

                {/* Recovery Timeline Graph - Estimated vs Actual */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-4">Recovery Timeline: Estimated vs Actual (Based on Medical Certificates)</h3>

                  {/* Graph Container */}
                  <div className="relative bg-white p-4 rounded border">

                    {/* Y-Axis Labels */}
                    <div className="absolute left-0 top-4 text-xs text-muted-foreground transform -rotate-90 origin-left">Work Capacity %</div>

                    {/* Graph Grid */}
                    <div className="ml-12 relative" style={{ height: "200px" }}>

                      {/* Horizontal Grid Lines */}
                      <div className="absolute inset-0">
                        <div className="absolute top-0 left-0 right-0 border-t border-gray-200"></div>
                        <div className="absolute top-1/4 left-0 right-0 border-t border-gray-100"></div>
                        <div className="absolute top-1/2 left-0 right-0 border-t border-gray-200"></div>
                        <div className="absolute top-3/4 left-0 right-0 border-t border-gray-100"></div>
                        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-300"></div>
                      </div>

                      {/* Y-Axis Values */}
                      <div className="absolute -left-8 inset-y-0 flex flex-col justify-between text-xs text-muted-foreground">
                        <span>100%</span>
                        <span>75%</span>
                        <span>50%</span>
                        <span>25%</span>
                        <span>0%</span>
                      </div>

                      {/* Estimated Recovery Line (Dashed Blue) */}
                      <svg className="absolute inset-0 w-full h-full">
                        <path
                          d="M 0 200 L 60 180 L 120 140 L 180 80 L 240 40 L 300 20"
                          stroke="#3b82f6"
                          strokeWidth="3"
                          strokeDasharray="8 4"
                          fill="none"
                        />
                      </svg>

                      {/* Actual Recovery Line (Solid Green) */}
                      <svg className="absolute inset-0 w-full h-full">
                        <path
                          d="M 0 200 L 80 190 L 140 160 L 200 100 L 260 60 L 320 10"
                          stroke="#10b981"
                          strokeWidth="3"
                          fill="none"
                        />
                      </svg>

                      {/* Certificate Markers */}
                      <div className="absolute" style={{ left: "80px", top: "190px" }}>
                        <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-md"></div>
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-center whitespace-nowrap">
                          <div className="font-medium">Cert #1</div>
                          <div className="text-muted-foreground">Apr 2025</div>
                          <div className="text-red-600">0% Capacity</div>
                        </div>
                      </div>

                      <div className="absolute" style={{ left: "140px", top: "160px" }}>
                        <div className="w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-md"></div>
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-center whitespace-nowrap">
                          <div className="font-medium">Cert #2</div>
                          <div className="text-muted-foreground">Jun 2025</div>
                          <div className="text-amber-600">20% Capacity</div>
                        </div>
                      </div>

                      <div className="absolute" style={{ left: "200px", top: "100px" }}>
                        <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-center whitespace-nowrap">
                          <div className="font-medium">Cert #3</div>
                          <div className="text-muted-foreground">Sep 2025</div>
                          <div className="text-blue-600">50% Capacity</div>
                        </div>
                      </div>

                      <div className="absolute" style={{ left: "260px", top: "60px" }}>
                        <div className="w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-md"></div>
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-center whitespace-nowrap">
                          <div className="font-medium">Cert #4</div>
                          <div className="text-muted-foreground">Nov 2025</div>
                          <div className="text-emerald-600">70% Capacity</div>
                        </div>
                      </div>

                      <div className="absolute" style={{ left: "320px", top: "10px" }}>
                        <div className="w-3 h-3 bg-emerald-600 rounded-full border-2 border-white shadow-md"></div>
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-center whitespace-nowrap">
                          <div className="font-medium">RTW</div>
                          <div className="text-muted-foreground">Dec 2025</div>
                          <div className="text-emerald-700">95% Capacity</div>
                        </div>
                      </div>
                    </div>

                    {/* X-Axis Labels */}
                    <div className="ml-12 mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>Mar 2025</span>
                      <span>May 2025</span>
                      <span>Jul 2025</span>
                      <span>Sep 2025</span>
                      <span>Nov 2025</span>
                      <span>Jan 2026</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0 border-t-2 border-dashed border-blue-500"></div>
                      <span>Estimated Recovery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0 border-t-2 border-emerald-500"></div>
                      <span>Actual Recovery (Certificate Data)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Medical Certificates</span>
                    </div>
                  </div>

                  {/* Analysis */}
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded">
                    <div className="text-sm">
                      <div className="font-semibold text-emerald-800 mb-1">Recovery Analysis:</div>
                      <div className="text-emerald-700">
                        • Initial recovery was slower than estimated (delayed by ~6 weeks)<br/>
                        • Accelerated improvement from September 2025 onward<br/>
                        • **Better than expected outcome**: achieved 95% capacity vs estimated 80%<br/>
                        • Return to work achieved 2 weeks ahead of revised timeline
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Timeline Graph */}
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gradient-to-b from-red-500 via-amber-500 via-blue-500 to-emerald-500"></div>

                  {/* Timeline Phases */}
                  <div className="space-y-8">

                    {/* Phase 1: Initial Treatment */}
                    <div className="relative flex items-start gap-6">
                      <div className="relative z-10 w-8 h-8 bg-red-100 border-4 border-red-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h3 className="font-semibold text-red-800 mb-2">Phase 1: Initial Treatment & Diagnosis</h3>
                          <div className="text-sm text-red-700 mb-2">March 19, 2025 - June 15, 2025 (12 weeks)</div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>GP Assessment & Referrals</span>
                              <Badge className="bg-emerald-100 text-emerald-800">✓ Complete</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Physiotherapy Program</span>
                              <Badge className="bg-emerald-100 text-emerald-800">✓ Complete</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Work Capacity Assessment</span>
                              <Badge className="bg-emerald-100 text-emerald-800">✓ Complete</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phase 2: Treatment Optimization */}
                    <div className="relative flex items-start gap-6">
                      <div className="relative z-10 w-8 h-8 bg-amber-100 border-4 border-amber-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <h3 className="font-semibold text-amber-800 mb-2">Phase 2: Treatment Optimization</h3>
                          <div className="text-sm text-amber-700 mb-2">June 16, 2025 - September 30, 2025 (15 weeks)</div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Specialized Hand Therapy</span>
                              <Badge className="bg-emerald-100 text-emerald-800">✓ Complete</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Functional Capacity Evaluation</span>
                              <Badge className="bg-emerald-100 text-emerald-800">✓ Complete</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Workplace Assessment</span>
                              <Badge className="bg-emerald-100 text-emerald-800">✓ Complete</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phase 3: Pre-RTW Preparation */}
                    <div className="relative flex items-start gap-6">
                      <div className="relative z-10 w-8 h-8 bg-blue-100 border-4 border-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="font-semibold text-blue-800 mb-2">Phase 3: Return-to-Work Preparation</h3>
                          <div className="text-sm text-blue-700 mb-2">October 1, 2025 - December 7, 2025 (10 weeks)</div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>RTW Planning Conference</span>
                              <Badge className="bg-emerald-100 text-emerald-800">✓ Complete</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Job Modification Assessment</span>
                              <Badge className="bg-emerald-100 text-emerald-800">✓ Complete</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Trial Duties Program</span>
                              <Badge className="bg-emerald-100 text-emerald-800">✓ Complete</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phase 4: Return to Work */}
                    <div className="relative flex items-start gap-6">
                      <div className="relative z-10 w-8 h-8 bg-emerald-100 border-4 border-emerald-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                          <h3 className="font-semibold text-emerald-800 mb-2">Phase 4: Successful Return to Work</h3>
                          <div className="text-sm text-emerald-700 mb-2">December 8, 2025 - March 2026 (3 months stabilization)</div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Full Duties Resumed</span>
                              <Badge className="bg-emerald-100 text-emerald-800">✓ Complete</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Regular Monitoring</span>
                              <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>3-Month Stability Review</span>
                              <Badge className="bg-amber-100 text-amber-800">Due March 2026</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recovery Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Functional Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Current Level</span>
                    <span className="text-sm font-semibold text-emerald-600">95%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "95%" }}></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Pre-injury: 100%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Symptom Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Pain Score</span>
                    <span className="text-sm font-semibold text-emerald-600">2/10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "80%" }}></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Peak: 8/10 (April 2025)</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Work Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Hours/Week</span>
                    <span className="text-sm font-semibold text-emerald-600">37/37</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "100%" }}></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Full capacity achieved</div>
                </CardContent>
              </Card>
            </div>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps & Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-sm">Ongoing Physiotherapy</div>
                      <div className="text-sm text-muted-foreground">Saturday appointments to maintain hand function and prevent recurrence</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-sm">Clearance Certificate</div>
                      <div className="text-sm text-muted-foreground">Formal medical clearance to be obtained during stability period</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-sm">Case Closure Review</div>
                      <div className="text-sm text-muted-foreground">Comprehensive assessment in March 2026 for potential case closure</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}