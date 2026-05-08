/**
 * Character portrait + room background asset registry.
 *
 * Drop new 3D-rendered portraits at:
 *   ./assets/images/char_<key>.png
 *
 * and the new tea-house room background at:
 *   ./assets/images/bg_room.png
 *
 * Then update the corresponding entry below to point at the new file.
 * Until then, we fall back to the legacy stylised PNGs that already ship.
 */

export type CharacterKey = 'barry' | 'stephan' | 'tiffany' | 'sandra';

export const CHARACTER_PORTRAITS: Record<CharacterKey, any> = {
  // Slot for the new render — replace with require('../assets/images/char_barry.png')
  // once that file exists.
  barry:   require('../assets/images/char_luna.png'),
  stephan: require('../assets/images/char_ryuu.png'),
  tiffany: require('../assets/images/char_kira.png'),
  sandra:  require('../assets/images/char_sensei.png'),
};

/**
 * Optional 3D room background. Returns `null` when no asset is present, in
 * which case the procedural `AnimatedBackground` is rendered instead. To use
 * a render, drop a file at `assets/images/bg_room.png` and switch the line
 * below to `require('../assets/images/bg_room.png')`.
 */
export const ROOM_BACKGROUND: any | null = null;

export const PLAYER_DISPLAY_NAMES: Record<CharacterKey, string> = {
  barry:   'Barry',
  stephan: 'Stephan',
  tiffany: 'Tiffany',
  sandra:  'Sandra',
};
