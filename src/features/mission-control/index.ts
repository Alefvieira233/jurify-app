/**
 * Public barrel for the mission-control feature.
 *
 * External consumers should import components from this file instead of
 * reaching into `./components/*` directly. Prevents cross-feature coupling
 * from pinning to internal paths. Audit P1 O2.2 (SistemaSection god component).
 */

export { default as BackupRestore } from './components/BackupRestore';
export { default as SecurityDashboard } from './components/SecurityDashboard';
export { default as SystemHealthCheck } from './components/SystemHealthCheck';
export { default as SystemStatus } from './components/SystemStatus';
export { default as MissionControl } from './MissionControl';
