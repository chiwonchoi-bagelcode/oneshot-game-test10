/* Level source: chapters, handcrafted levels and generated picks.
 * A slot is either a full level ({ map, goal, inks, ... }) or { pick: recipe, at: 0..1 }
 * where `at` chooses by difficulty inside that recipe's verified pool (0 = gentlest). */
'use strict';
module.exports = {
  chapters: [
    {
      id: 'c1', name: { ko: '첫 방울', en: 'First Drops' }, desc: { ko: '번지고, 만나고, 섞이는 법', en: 'How ink spreads, meets and mixes' },
      paper: 'hanji', tempo: 700,
      names: [['첫 방울', 'First Drop'], ['두 물가', 'Two Shores'], ['보랏빛 길', 'Violet Path'], ['기다려', 'Wait for It'], ['노을', 'Sunset'], ['새싹', 'Sprout'],
        ['먼저 온 쪽', 'First Come'], ['저녁 강', 'Evening River'], ['세 갈래', 'Three Ways'], ['우물가', 'By the Wells'], ['귤밭', 'Tangerine Field'], ['첫 장의 끝', 'End of Book One']],
      slots: [
        { id: 'first-drop', tempo: 760, tapCue: true, map: ['..#..', '.....', '.....', '#...#', '##.##'], goal: ['.....', 'R...R', '.....', '.....', '..R..'], inks: ['R'], sol: [{ x: 2, y: 2, t: 0 }] },
        { id: 'two-shores', tempo: 760, map: ['.....', '.....', '.....', '.....', '.....', '.....'], goal: ['.....', 'R...B', '.....', '.....', 'R...B', '.....'], inks: ['R', 'B'], sol: [{ x: 0, y: 2, t: 0 }, { x: 4, y: 3, t: 1 }] },
        { id: 'violet-path', tempo: 760, intro: 'mix', map: ['.......', '.......', '.R.....', '.......', '.......'], goal: ['.......', '...P...', '...P...', '...P...', '.......'], inks: ['B'] },
        { id: 'wait-for-it', tempo: 760, intro: 'well', tapCue: true, map: ['.......', 'o.....o', '.......'], goal: ['....P..', '....P..', '....P..'], inks: ['R', 'B'] },
        { id: 'sunset', map: ['......', '......', '......', '......', '......', '......'], goal: ['......', '.....O', '....O.', '...O..', '..O...', '.O....'], inks: ['Y', 'R'] },
        { pick: 'c1_yb', at: 0.05 },
        { pick: 'c1_race', at: 0.1 },
        { pick: 'c1_rb', at: 0.4 },
        { id: 'three-ways', map: ['o.....o', '.......', '.......', '.......', '.......', '.......', '...o...'], goal: ['.......', '....O..', '.......', '.......', '..P..G.', '.......', '.......'], inks: ['R', 'Y', 'B'] },
        { pick: 'c1_wells', at: 0.3 },
        { pick: 'c1_ry', at: 0.6 },
        { pick: 'c1_ryb', at: 0.15 }
      ]
    },
    {
      id: 'c2', name: { ko: '벽과 길', en: 'Walls & Ways' }, desc: { ko: '돌아가는 길은 시간이 걸려요', en: 'The long way round takes time' },
      paper: 'kraft', tempo: 660,
      names: [['모퉁이', 'Around the Corner'], ['골목', 'Alley'], ['정원 담장', 'Garden Wall'], ['두 방', 'Two Rooms'], ['다리 밑', 'Under the Bridge'], ['미로', 'Labyrinth'],
        ['창문', 'Window'], ['돌담', 'Stone Fence'], ['성곽', 'Rampart'], ['복도', 'Corridor'], ['계단', 'Stairs'], ['성문', 'Castle Gate']],
      slots: [
        { id: 'around', intro: 'wall', map: ['.......', '.o.#.o.', '...#...', '...#...', '.......'], goal: ['....P..', '.......', '.......', '.......', '....P..'], inks: ['R', 'B'] },
        { pick: 'c2_rb', at: 0.0 },
        { pick: 'b2', at: 0.1 },
        { pick: 'c2_yb', at: 0.1 },
        { pick: 'c2_rooms', at: 0.2 },
        { id: 'labyrinth', map: ['o......', '######.', '.......', '.######', '.......', '######.', 'o......'], goal: ['.......', '.......', '.......', '.......', '.P.....', '.......', '.......'], inks: ['R', 'B'] },
        { pick: 'c2_rb', at: 0.45 },
        { pick: 'b2', at: 0.5 },
        { pick: 'c2_wells', at: 0.3 },
        { pick: 'c2_ryb', at: 0.1 },
        { pick: 'c2_wells', at: 0.75 },
        { pick: 'c2_ryb', at: 0.6 }
      ]
    },
    {
      id: 'c3', name: { ko: '잠든 잉크', en: 'Sleeping Ink' }, desc: { ko: '닿으면 깨어나 번져요', en: 'A touch wakes them up' },
      paper: 'sage', tempo: 640,
      names: [['잠든 잉크', 'Sleeping Ink'], ['이른 아침', 'Early Morning'], ['반딧불', 'Fireflies'], ['도미노', 'Dominoes'], ['깨우기', 'Wake-up Call'], ['씨앗', 'Seeds'],
        ['연쇄', 'Chain Reaction'], ['꿀벌', 'Honeybee'], ['새벽', 'Dawn'], ['메아리', 'Echo'], ['불씨', 'Embers'], ['봄', 'Spring']],
      slots: [
        { id: 'sleeping', intro: 'seed', map: ['.......', '.......', '...b...', '.......', '.......', '.......', '.......'], goal: ['...B...', '.......', '..P.P..', '.......', '.......', '.......', '.......'], inks: ['R'] },
        { pick: 'c3_one', at: 0.1 },
        { pick: 'b3', at: 0.1 },
        { pick: 'c3_two', at: 0.05 },
        { pick: 'c3_chain', at: 0.1 },
        { pick: 'c3_one', at: 0.6 },
        { pick: 'b3', at: 0.6 },
        { pick: 'c3_mixed', at: 0.1 },
        { pick: 'c3_chain', at: 0.5 },
        { pick: 'c3_three', at: 0.1 },
        { pick: 'c3_mixed', at: 0.5 },
        { pick: 'c3_three', at: 0.6 }
      ]
    },
    {
      id: 'c4', name: { ko: '여백', en: 'White Space' }, desc: { ko: '남겨 둘 줄도 알아야 해요', en: 'Know what to leave blank' },
      paper: 'rose', tempo: 620,
      names: [['짧은 잉크', 'Short Ink'], ['여백', 'White Space'], ['섬', 'Islands'], ['징검다리', 'Stepping Stones'], ['눈밭', 'Snowfield'], ['봉인', 'The Seal'],
        ['안개', 'Fog'], ['쉼표', 'Comma'], ['구름', 'Clouds'], ['등불', 'Lantern'], ['고요', 'Stillness'], ['빈 방', 'Empty Room']],
      slots: [
        { id: 'short-ink', intro: 'short', map: ['.....', '.....', '.....', '.....', '.....'], goal: ['..R..', '.....', 'R...R', '.....', '..R..'], inks: ['R2'] },
        { id: 'white-space', intro: 'dry', map: ['......', '......', '......', '......', '......'], goal: ['B....x', '......', 'B...x.', '......', 'B....x'], inks: ['B3'] },
        { pick: 'c4_short', at: 0.05 },
        { pick: 'b4', at: 0.1 },
        { pick: 'c4_mixed', at: 0.1 },
        { id: 'seal', intro: 'seam', map: ['o......', '......o', '.......', '###.###', '###.###', '###.###'], goal: ['.......', '.......', '.......', '.......', '.......', '...x...'], inks: ['R', 'B'] },
        { pick: 'c4_seed', at: 0.1 },
        { pick: 'b4', at: 0.6 },
        { pick: 'c4_short', at: 0.6 },
        { pick: 'c4_three', at: 0.1 },
        { pick: 'c4_seed', at: 0.5 },
        { pick: 'c4_three', at: 0.8 }
      ]
    },
    {
      id: 'c5', name: { ko: '두꺼운 종이', en: 'Heavy Paper' }, desc: { ko: '잉크가 한 박자 쉬어 가는 곳', en: 'Where ink rests an extra beat' },
      paper: 'mist', tempo: 620,
      names: [['두꺼운 종이', 'Heavy Paper'], ['젖은 모래', 'Wet Sand'], ['이끼', 'Moss'], ['늪', 'Marsh'], ['솜', 'Cotton'], ['진흙길', 'Mud Road'],
        ['눈길', 'Snowy Path'], ['갯벌', 'Tidal Flat'], ['양털', 'Fleece'], ['비 온 뒤', 'After the Rain'], ['물안개', 'River Mist'], ['장마', 'Monsoon']],
      slots: [
        { id: 'heavy-paper', intro: 'thick', map: ['.~~....', 'o~~...o', '.~~....'], goal: ['...P...', '...P...', '...P...'], inks: ['R', 'B'] },
        { pick: 'c5_rb', at: 0.05 },
        { pick: 'b5', at: 0.1 },
        { pick: 'c5_walls', at: 0.1 },
        { pick: 'c5_seed', at: 0.1 },
        { pick: 'b5', at: 0.6 },
        { pick: 'c5_rb', at: 0.5 },
        { pick: 'c5_walls', at: 0.5 },
        { pick: 'c5_ryb', at: 0.1 },
        { pick: 'c5_seed', at: 0.6 },
        { pick: 'c5_walls', at: 0.9 },
        { pick: 'c5_ryb', at: 0.7 }
      ]
    },
    {
      id: 'c6', name: { ko: '걸작', en: 'Masterworks' }, desc: { ko: '모든 것을 한 장에', en: 'Everything on one sheet' },
      paper: 'gold', tempo: 620,
      names: [['걸작', 'Masterwork'], ['모자이크', 'Mosaic'], ['스테인드글라스', 'Stained Glass'], ['태피스트리', 'Tapestry'], ['만다라', 'Mandala'], ['오로라', 'Aurora'],
        ['불꽃놀이', 'Fireworks'], ['단풍', 'Autumn Leaves'], ['은하', 'Galaxy'], ['무지개', 'Rainbow'], ['교향곡', 'Symphony'], ['마지막 한 장', 'The Final Sheet']],
      slots: [
        { pick: 'b6', at: 0.1 },
        { pick: 'c6_d', at: 0.1 },
        { pick: 'c6_a', at: 0.1 },
        { pick: 'c6_b', at: 0.1 },
        { pick: 'b6', at: 0.5 },
        { pick: 'c6_c', at: 0.1 },
        { pick: 'c6_a', at: 0.5 },
        { pick: 'c6_b', at: 0.5 },
        { pick: 'b6', at: 0.9 },
        { pick: 'c6_c', at: 0.6 },
        { pick: 'c6_a', at: 0.9 },
        { pick: 'c6_d', at: 0.9 }
      ]
    }
  ],
  daily: ['d_open', 'd_walls', 'd_seed', 'd_thick', 'd_dry']
};
