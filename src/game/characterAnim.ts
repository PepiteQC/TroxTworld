/**
 * Mixer d'animations personnage — clips idle / walk / run + crossfade.
 * Se branche sur les joints existants (voyageur, TroxT). Pas de second avatar.
 */
import * as THREE from "three";

export interface AnimationControllerConfig {
  scene: THREE.Group | THREE.Scene;
  gltfUrl?: string;
  onLoaded?: (object: THREE.Object3D) => void;
}

function tagJoints(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (obj.userData.leg === -1 && (!obj.name || obj.name.startsWith("ether"))) obj.name = "LegLJoint";
    if (obj.userData.leg === 1 && (!obj.name || obj.name.startsWith("ether"))) obj.name = "LegRJoint";
    if (obj.userData.arm === -1 && (!obj.name || obj.name.startsWith("ether"))) obj.name = "ArmLJoint";
    if (obj.userData.arm === 1 && obj.name !== "ArmRJoint") {
      if (!obj.name || obj.name === "ether-arm-r") obj.name = "ArmRJoint";
    }
  });
  const torso = root.getObjectByName("ether-body") ?? root.getObjectByName("TorsoJoint");
  if (torso && torso.name !== "TorsoJoint") torso.name = "TorsoJoint";
  const head =
    root.getObjectByName("HeadJoint") ??
    root.getObjectByName("hero-face")?.parent ??
    null;
  if (head && !head.name) head.name = "HeadJoint";
}

export class CharacterAnimationManager {
  public mixer: THREE.AnimationMixer | null = null;
  public actions: Map<string, THREE.AnimationAction> = new Map();
  public currentActionName = "idle";
  public rootObject: THREE.Group;
  public bound = false;
  public enabled = true;

  constructor(parent: THREE.Group) {
    this.rootObject = parent;
    this.bindExisting();
  }

  static attach(group: THREE.Group): CharacterAnimationManager | null {
    if (group.getObjectByName("fbx-stub")) return null;
    if (group.getObjectByName("fbx:casual") || group.name.startsWith("fbx:")) return null;
    if (group.userData.mixer) return null;
    let hasLimb = false;
    group.traverse((obj) => {
      if (obj.userData.arm || obj.userData.leg) hasLimb = true;
    });
    if (!hasLimb) return null;
    return new CharacterAnimationManager(group);
  }

  bindExisting() {
    tagJoints(this.rootObject);
    const hasArm = !!this.rootObject.getObjectByName("ArmLJoint");
    const hasLeg = !!this.rootObject.getObjectByName("LegLJoint");
    if (!hasArm && !hasLeg) return;

    this.mixer = new THREE.AnimationMixer(this.rootObject);
    this.actions.clear();

    const idleHead = new THREE.NumberKeyframeTrack("HeadJoint.rotation[y]", [0, 1, 2], [0, 0.08, 0]);
    const idleTorso = new THREE.NumberKeyframeTrack("TorsoJoint.rotation[x]", [0, 1, 2], [0, 0.03, 0]);
    const idleClip = new THREE.AnimationClip("idle", 2, [idleHead, idleTorso]);

    const walkTimes = [0, 0.25, 0.5, 0.75, 1.0];
    const walkClip = new THREE.AnimationClip("walk", 1.0, [
      new THREE.NumberKeyframeTrack("LegLJoint.rotation[x]", walkTimes, [0, 0.45, 0, -0.45, 0]),
      new THREE.NumberKeyframeTrack("LegRJoint.rotation[x]", walkTimes, [0, -0.45, 0, 0.45, 0]),
      new THREE.NumberKeyframeTrack("ArmLJoint.rotation[x]", walkTimes, [0, -0.38, 0, 0.38, 0]),
      new THREE.NumberKeyframeTrack("ArmRJoint.rotation[x]", walkTimes, [0, 0.38, 0, -0.38, 0]),
    ]);

    const runTimes = [0, 0.15, 0.3, 0.45, 0.6];
    const runClip = new THREE.AnimationClip("run", 0.6, [
      new THREE.NumberKeyframeTrack("LegLJoint.rotation[x]", runTimes, [0, 0.75, 0, -0.75, 0]),
      new THREE.NumberKeyframeTrack("LegRJoint.rotation[x]", runTimes, [0, -0.75, 0, 0.75, 0]),
      new THREE.NumberKeyframeTrack("ArmLJoint.rotation[x]", runTimes, [0, -0.65, 0, 0.65, 0]),
      new THREE.NumberKeyframeTrack("ArmRJoint.rotation[x]", runTimes, [0, 0.65, 0, -0.65, 0]),
    ]);

    for (const clip of [idleClip, walkClip, runClip]) {
      const action = this.mixer.clipAction(clip);
      action.enabled = true;
      this.actions.set(clip.name, action);
    }
    this.actions.get("idle")?.play();
    this.bound = true;
  }

  playAction(actionName: string, fadeDuration = 0.25) {
    if (!this.enabled || this.currentActionName === actionName) return;
    const currentAction = this.actions.get(this.currentActionName);
    const nextAction = this.actions.get(actionName);
    if (!nextAction) return;
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    if (currentAction) currentAction.crossFadeTo(nextAction, fadeDuration, true);
    nextAction.play();
    this.currentActionName = actionName;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) {
      for (const action of this.actions.values()) {
        action.setEffectiveWeight(0);
      }
    } else {
      const cur = this.actions.get(this.currentActionName);
      if (cur) cur.setEffectiveWeight(1);
    }
  }

  update(dt: number, speed: number) {
    if (!this.mixer || !this.bound) return;
    if (this.enabled) {
      if (speed > 4.5) this.playAction("run", 0.2);
      else if (speed > 0.3) this.playAction("walk", 0.2);
      else this.playAction("idle", 0.25);
    }
    this.mixer.update(dt);
  }
}

export { CharacterAnimationManager as AnimatedCharacterMixer };
