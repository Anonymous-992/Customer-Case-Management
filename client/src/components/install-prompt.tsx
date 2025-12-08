import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function InstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
	const [showPrompt, setShowPrompt] = useState(false);

	useEffect(() => {
		const handler = (e: Event) => {
			// Prevent the mini-infobar from appearing on mobile
			e.preventDefault();
			// Stash the event so it can be triggered later
			setDeferredPrompt(e);
			// Show the install prompt
			setShowPrompt(true);
		};

		window.addEventListener('beforeinstallprompt', handler);

		return () => {
			window.removeEventListener('beforeinstallprompt', handler);
		};
	}, []);

	const handleInstallClick = async () => {
		if (!deferredPrompt) {
			return;
		}

		// Show the install prompt
		deferredPrompt.prompt();

		// Wait for the user to respond to the prompt
		const { outcome } = await deferredPrompt.userChoice;

		console.log(`User response to the install prompt: ${outcome}`);

		// Clear the deferredPrompt
		setDeferredPrompt(null);
		setShowPrompt(false);
	};

	const handleDismiss = () => {
		setShowPrompt(false);
		// Store dismissal in localStorage
		localStorage.setItem('pwa-install-dismissed', 'true');
	};

	// Don't show if dismissed before
	if (localStorage.getItem('pwa-install-dismissed') === 'true') {
		return null;
	}

	if (!showPrompt || !deferredPrompt) {
		return null;
	}

	return (
		<div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-5">
			<Card className="border-2 border-primary/20 shadow-lg">
				<CardContent className="pt-6">
					<div className="flex items-start gap-4">
						<div className="flex-shrink-0">
							<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
								<Download className="h-6 w-6 text-primary" />
							</div>
						</div>
						<div className="flex-1 space-y-2">
							<h3 className="font-semibold text-sm">Install AKITO CMS</h3>
							<p className="text-sm text-muted-foreground">
								Install our app for a better experience. Quick access from your home screen!
							</p>
							<div className="flex gap-2 pt-2">
								<Button
									onClick={handleInstallClick}
									size="sm"
									className="flex-1"
								>
									<Download className="h-4 w-4 mr-2" />
									Install
								</Button>
								<Button
									onClick={handleDismiss}
									variant="outline"
									size="sm"
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
