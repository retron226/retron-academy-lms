import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function Privacy() {
    return (
        <div className="container py-10 px-4 md:px-6 max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">Privacy Policy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    <p>Last updated: December 08, 2025</p>
                    <h2 className="text-xl font-semibold text-foreground">1. Data Collection</h2>
                    <p>
                        We collect information you provide directly to us, such as when you create an account, update your profile, or subscribe to our content. This includes name, email, and college information.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">2. Use of Information</h2>
                    <p>
                        We use the information we collect to operate, maintain, and provide the features and functionality of the Service. We do not sell your personal data to third parties.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">3. Security</h2>
                    <p>
                        We care about the security of your information and use commercially reasonable physical, administrative, and technological safeguards to preserve the integrity and security of all information we collect and store.
                    </p>
                    {/* Add more legal jargon as needed */}
                </CardContent>
            </Card>
        </div>
    );
}
