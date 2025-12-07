import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function Terms() {
    return (
        <div className="container py-10 px-4 md:px-6 max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">Terms of Service</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    <p>Last updated: December 08, 2025</p>
                    <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
                    <p>
                        Welcome to Retron Academy. By accessing our website and using our services, you agree to be bound by these Terms of Service.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">2. Use of License</h2>
                    <p>
                        Permission is granted to temporarily download one copy of the materials (information or software) on Retron Academy's website for personal, non-commercial transitory viewing only.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">3. Disclaimer</h2>
                    <p>
                        The materials on Retron Academy's website are provided on an 'as is' basis. Retron Academy makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                    </p>
                    {/* Add more legal jargon as needed */}
                </CardContent>
            </Card>
        </div>
    );
}
