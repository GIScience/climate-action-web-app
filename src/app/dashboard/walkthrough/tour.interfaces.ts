import { DriveStep } from 'driver.js'

export interface ExtendedDriveStep extends DriveStep {
    onNextClicked?: () => void
}
