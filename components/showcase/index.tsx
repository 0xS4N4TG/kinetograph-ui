import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { ThreePhone, threePhoneDefaults, threePhoneSchema, W, H, FPS, DURATION } from './three-phone.js';
import { PhonePitch, phonePitchDefaults, phonePitchSchema, W as PPW, H as PPH, FPS as PPFPS, DURATION as PPD } from './phone-pitch.js';
import { ScreenTunnel, screenTunnelDefaults, screenTunnelSchema, W as STW, H as STH, FPS as STF, DURATION as STD } from './screen-tunnel.js';
import { LaptopOpen, laptopOpenDefaults, laptopOpenSchema, W as LW_, H as LH_, FPS as LF, DURATION as LD } from './laptop-open.js';
import { ScreenTouch, screenTouchDefaults, screenTouchSchema, W as TW, H as TH, FPS as TF, DURATION as TD } from './screen-touch.js';
import { CheckoutPush, checkoutPushDefaults, checkoutPushSchema, W as CW, H as CH, FPS as CF, DURATION as CD } from './checkout-push.js';
import { VaultCount, vaultCountDefaults, vaultCountSchema, W as VW, H as VH, FPS as VF, DURATION as VD } from './vault-count.js';
import { RecapDial, recapDialDefaults, recapDialSchema, W as RW, H as RH, FPS as RF, DURATION as RD } from './recap-dial.js';
import { BuildOut, buildOutDefaults, buildOutSchema, W as BW, H as BH, FPS as BF, DURATION as BD } from './build-out.js';
import { LaunchFilm, launchFilmDefaults, launchFilmSchema, W as LFW, H as LFH, FPS as LFF, DURATION as LFD } from './launch-film.js';
import { PromptIntro, promptIntroDefaults, promptIntroSchema, W as PIW, H as PIH, FPS as PIF, DURATION as PID } from './prompt-intro.js';
import { AppLaunch, appLaunchDefaults, appLaunchSchema, W as ALW, H as ALH, FPS as ALF, DURATION as ALD } from './app-launch.js';

registerRoot(() => (
  <>
    <Composition id="ThreePhone" component={ThreePhone} schema={threePhoneSchema} defaultProps={threePhoneDefaults}
      durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="PhonePitch" component={PhonePitch} schema={phonePitchSchema} defaultProps={phonePitchDefaults}
      durationInFrames={PPD} fps={PPFPS} width={PPW} height={PPH} />
    <Composition id="ScreenTunnel" component={ScreenTunnel} schema={screenTunnelSchema} defaultProps={screenTunnelDefaults}
      durationInFrames={STD} fps={STF} width={STW} height={STH} />
    <Composition id="LaptopOpen" component={LaptopOpen} schema={laptopOpenSchema} defaultProps={laptopOpenDefaults}
      durationInFrames={LD} fps={LF} width={LW_} height={LH_} />
    <Composition id="ScreenTouch" component={ScreenTouch} schema={screenTouchSchema} defaultProps={screenTouchDefaults}
      durationInFrames={TD} fps={TF} width={TW} height={TH} />
    <Composition id="CheckoutPush" component={CheckoutPush} schema={checkoutPushSchema} defaultProps={checkoutPushDefaults}
      durationInFrames={CD} fps={CF} width={CW} height={CH} />
    <Composition id="VaultCount" component={VaultCount} schema={vaultCountSchema} defaultProps={vaultCountDefaults}
      durationInFrames={VD} fps={VF} width={VW} height={VH} />
    <Composition id="BuildOut" component={BuildOut} schema={buildOutSchema} defaultProps={buildOutDefaults}
      durationInFrames={BD} fps={BF} width={BW} height={BH} />
    <Composition id="RecapDial" component={RecapDial} schema={recapDialSchema} defaultProps={recapDialDefaults}
      durationInFrames={RD} fps={RF} width={RW} height={RH} />
    <Composition id="LaunchFilm" component={LaunchFilm} schema={launchFilmSchema} defaultProps={launchFilmDefaults}
      durationInFrames={LFD} fps={LFF} width={LFW} height={LFH} />
    <Composition id="PromptIntro" component={PromptIntro} schema={promptIntroSchema} defaultProps={promptIntroDefaults}
      durationInFrames={PID} fps={PIF} width={PIW} height={PIH} />
    <Composition id="AppLaunch" component={AppLaunch} schema={appLaunchSchema} defaultProps={appLaunchDefaults}
      durationInFrames={ALD} fps={ALF} width={ALW} height={ALH} />
  </>
));
