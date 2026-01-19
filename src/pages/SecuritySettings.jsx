import { useState } from "react";
import { Input } from "../components/ui/input";
import { Shield, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function SecuritySettings({ course, setCourse }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <Card>
                <CardHeader
                    className="cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <CardTitle>Security & Access Control</CardTitle>
                        </div>
                        {expanded ? <ChevronDown /> : <ChevronRight />}
                    </div>
                </CardHeader>
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <CardContent className="space-y-6 pt-0">
                                <DeviceRestrictions
                                    enabled={course.deviceRestrictions}
                                    maxDevices={course.maxDevices}
                                    onToggle={(enabled) => setCourse({ ...course, deviceRestrictions: enabled })}
                                    onMaxDevicesChange={(max) => setCourse({ ...course, maxDevices: max })}
                                />

                                <GuestAccess
                                    enabled={course.guestAccessEnabled}
                                    onToggle={(enabled) => setCourse({ ...course, guestAccessEnabled: enabled })}
                                />
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
}

function DeviceRestrictions({ enabled, maxDevices, onToggle, onMaxDevicesChange }) {
    return (
        <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
                <h4 className="font-medium">Device Restrictions</h4>
                <p className="text-sm text-muted-foreground">
                    Limit users to {maxDevices} registered devices (MAC address tracking)
                </p>
            </div>
            <div className="flex items-center gap-3">
                <Input
                    type="number"
                    min="1"
                    max="5"
                    value={maxDevices}
                    onChange={(e) => onMaxDevicesChange(parseInt(e.target.value))}
                    className="w-20"
                    disabled={!enabled}
                />
                <ToggleSwitch enabled={enabled} onToggle={onToggle} />
            </div>
        </div>
    );
}

function GuestAccess({ enabled, onToggle }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium">Guest Access</h4>
                    <p className="text-sm text-muted-foreground">
                        Allow time-limited guest access with auto-expiration
                    </p>
                </div>
                <ToggleSwitch enabled={enabled} onToggle={onToggle} />
            </div>

            {enabled && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-lg bg-muted/20 space-y-3"
                >
                    <h5 className="font-medium">Guest Account Settings</h5>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Default Expiry</label>
                            <select className="w-full text-sm border rounded p-2" defaultValue="7">
                                <option value="1">24 Hours</option>
                                <option value="3">3 Days</option>
                                <option value="7">7 Days</option>
                                <option value="30">30 Days</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Alert Before</label>
                            <select className="w-full text-sm border rounded p-2" defaultValue="24">
                                <option value="1">1 Hour</option>
                                <option value="12">12 Hours</option>
                                <option value="24">24 Hours</option>
                                <option value="72">3 Days</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Guest accounts automatically expire and are disabled
                    </p>
                </motion.div>
            )}
        </div>
    );
}

function ToggleSwitch({ enabled, onToggle }) {
    return (
        <div className="relative">
            <input
                type="checkbox"
                id="toggle"
                checked={enabled}
                onChange={(e) => onToggle(e.target.checked)}
                className="sr-only"
            />
            <label
                htmlFor="toggle"
                className={`block w-12 h-6 rounded-full cursor-pointer transition-colors duration-200 ${enabled ? 'bg-primary' : 'bg-muted'}`}
            >
                <span className={`block w-4 h-4 mt-1 ml-1 rounded-full bg-white transition-transform duration-200 ${enabled ? 'transform translate-x-6' : ''}`} />
            </label>
        </div>
    );
}