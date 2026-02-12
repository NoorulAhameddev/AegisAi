import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "admin-settings.json");

export interface SystemSettings {
    allowRegistrations: boolean;
    maintenanceMode: boolean;
}

export function getSettings(): SystemSettings {
    if (!fs.existsSync(SETTINGS_FILE)) {
        return { allowRegistrations: true, maintenanceMode: false };
    }
    try {
        return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    } catch {
        return { allowRegistrations: true, maintenanceMode: false };
    }
}

export function saveSettings(settings: SystemSettings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
