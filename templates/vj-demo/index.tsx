// The vj plugin on public-domain archive film (Blacksmith Scene, 1893; Fred Ott's Sneeze, 1894; a 1927 parade):
// blob tracking over a 1-bit picture (`Blobs`), over a thermal camera (`Thermal`), a CRT that switches off (`Crt`) and
// a worn tape (`Vhs`) and Fred Ott cut to an anime poster (`PopArt`). The blob tracks in track/ were made once with
// plugins/vj/tools/blobs.mjs; Fred Ott's matte (public/fred-matte.mp4) and track/fred-person.json with tools/matte.mjs.
//
// Render from the kinetograph-ui root:
//   node ../kinetograph/packages/cli/dist/cli.js render templates/vj-demo/index.tsx --comp Blobs -o templates/vj-demo/out/blobs.mp4

import React from 'react';
import { AbsoluteFill, Composition, Layer, Video, interpolate, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { Blobs, PopArt, crt, oneBit, switchOff, thermal, vhs, type BlobTrack, type PointTrack } from '../../plugins/vj/src/index.js';
import smithBlobs from './track/blacksmith-blobs.json' with { type: 'json' };
import paradeBlobs from './track/veteran-blobs.json' with { type: 'json' };
import fredPerson from './track/fred-person.json' with { type: 'json' };

const W = 1920;
const H = 1080;
const FPS = 30;

const Clip: React.FC<{ src: string }> = ({ src }) => <Video src={staticFile(src)} width={W} height={H} fit="cover" muted />;

const BlobsShot: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Layer id="smith" effects={oneBit({ size: 2, ink: '#000000', paper: '#ffffff' })}>
      <Clip src="blacksmith.mp4" />
    </Layer>
    <Blobs track={smithBlobs as BlobTrack} min={0.004} links="all" reach={0.25} max={10} invert={0.3} blend="difference" />
  </AbsoluteFill>
);

const ThermalShot: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Layer id="parade" effects={thermal()}>
      <Clip src="veteran.mp4" />
    </Layer>
    <Blobs track={paradeBlobs as BlobTrack} box="corners" label="id" links="chain" color="#e8fff4" />
  </AbsoluteFill>
);

const CrtShot: React.FC = () => {
  const frame = useCurrentFrame();
  const off = interpolate(frame, [96, 112], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: '#050505' }}>
      <Layer id="tube" effects={[crt({ hw: 820, hh: 470, curve: 0.08, ...switchOff(off) })]}>
        <Clip src="fred.mp4" />
      </Layer>
    </AbsoluteFill>
  );
};

const VhsShot: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Layer id="tape" effects={[vhs({ track: 0.5, trackAt: (useCurrentFrame() / 90) % 1 })]}>
      <Clip src="veteran.mp4" />
    </Layer>
  </AbsoluteFill>
);

const PopArtShot: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <PopArt
      src={staticFile('fred.mp4')}
      matte={staticFile('fred-matte.mp4')}
      track={fredPerson as PointTrack}
      cuts={[{ in: [14, 28], out: [92, 112], origin: [700, 640] }]}
      title={{ kicker: 'KINETOSCOPE 1894', line1: 'FRED OTT', line2: 'SNEEZE' }}
    />
  </AbsoluteFill>
);

registerRoot(() => (
  <>
    <Composition id="Blobs" component={BlobsShot} durationInFrames={78} fps={FPS} width={W} height={H} />
    <Composition id="Thermal" component={ThermalShot} durationInFrames={77} fps={FPS} width={W} height={H} />
    <Composition id="Crt" component={CrtShot} durationInFrames={120} fps={FPS} width={W} height={H} />
    <Composition id="Vhs" component={VhsShot} durationInFrames={77} fps={FPS} width={W} height={H} />
    <Composition id="PopArt" component={PopArtShot} durationInFrames={120} fps={FPS} width={W} height={H} />
  </>
));
