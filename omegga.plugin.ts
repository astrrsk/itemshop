import OmeggaPlugin, { OL, PS, PC, OmeggaPlayer } from 'omegga';

type Config = { checkRole: string, whitelist: boolean };
type Storage = { shops: any[] };

const DS_STORES = 'itemshop_stores_'; // const for store keys

const WEAPON_MAP = { // Map for WeaponClass strings to more human-friendly ones
  'anti materiel rifle': 'Weapon_AntiMaterielRifle',
  'arming sword': 'Weapon_ArmingSword',
  'assault rifle': 'Weapon_AssaultRifle',
  'auto shotgun': 'Weapon_AutoShotgun',
  'battleaxe': 'Weapon_Battleaxe',
  'bazooka': 'Weapon_Bazooka',
  'bow': 'Weapon_Bow',
  'bullpup rifle': 'Weapon_BullpupRifle',
  'bullpup smg': 'Weapon_BullpupSMG',
  'charged longsword': 'Weapon_ChargedLongsword',
  'crystal kalis': 'Weapon_CrystalKalis',
  'derringer': 'Weapon_Derringer',
  'flintlock pistol': 'Weapon_FlintlockPistol',
  'grenade launcher': 'Weapon_GrenadeLauncher',
  'handaxe': 'Weapon_Handaxe',
  'health potion': 'Weapon_HealthPotion',
  'heavy assault rifle': 'Weapon_HeavyAssaultRifle',
  'heavy smg': 'Weapon_HeavySMG',
  'hero sword': 'Weapon_HeroSword',
  'high power pistol': 'Weapon_HighPowerPistol',
  'holo blade': 'Weapon_HoloBlade',
  'hunting shotgun': 'Weapon_HuntingShotgun',
  'ikakalaka': 'Weapon_Ikakalaka',
  'impact grenade': 'Weapon_ImpactGrenade',
  'impact grenade launcher': 'Weapon_ImpactGrenadeLauncher',
  'impulse grenade': 'Weapon_ImpulseGrenade',
  'khopesh': 'Weapon_Khopesh',
  'knife': 'Weapon_Knife',
  'lever action rifle': 'Weapon_LeverActionRifle',
  'light machine gun': 'Weapon_LightMachineGun',
  'long sword': 'Weapon_LongSword',
  'magnum pistol': 'Weapon_MagnumPistol',
  'micro smg': 'Weapon_MicroSMG',
  'minigun': 'Weapon_Minigun',
  'pistol': 'Weapon_Pistol',
  'pulse carbine': 'Weapon_PulseCarbine',
  'quad launcher': 'Weapon_QuadLauncher',
  'revolver': 'Weapon_Revolver',
  'rocket jumper': 'Weapon_RocketJumper',
  'rocket launcher': 'Weapon_RocketLauncher',
  'sabre': 'Weapon_Sabre',
  'semi auto rifle': 'Weapon_SemiAutoRifle',
  'service rifle': 'Weapon_ServiceRifle',
  'shotgun': 'Weapon_Shotgun',
  'slug shotgun': 'Weapon_SlugShotgun',
  'sniper': 'Weapon_Sniper',
  'spatha': 'Weapon_Spatha',
  'standard submachine gun': 'Weapon_StandardSubmachineGun',
  'stick grenade': 'Weapon_StickGrenade',
  'submachine gun': 'Weapon_SubmachineGun',
  'super shotgun': 'Weapon_SuperShotgun',
  'suppressed assault rifle': 'Weapon_SuppressedAssaultRifle',
  'suppressed bullpup smg': 'Weapon_SuppressedBullpupSMG',
  'suppressed pistol': 'Weapon_SuppressedPistol',
  'suppressed service rifle': 'Weapon_SuppressedServiceRifle',
  'tactical shotgun': 'Weapon_TacticalShotgun',
  'tactical smg': 'Weapon_TacticalSMG',
  'tomahawk': 'Weapon_Tomahawk',
  'twin cannon': 'Weapon_TwinCannon',
  'typewriter smg': 'Weapon_TypewriterSMG',
  'zweihander': 'Weapon_Zweihander'
}

export default class Plugin implements OmeggaPlugin<Config, Storage> {
  omegga: OL;
  config: PC<Config>;
  store: PS<Storage>;

  constructor(omegga: OL, config: PC<Config>, store: PS<Storage>) {
    this.omegga = omegga;
    this.config = config;
    this.store = store;
  }

  private argumentsValid(args: string[]): boolean {
    let undef = true;
    args.forEach((i) => {
      if (i == undefined) undef = false;
    })
    return undef;
  }

  private desconstructArgs(args: string[]): string[] { // Trust me i hate this function too
    let newArgs = args.toString()
    let [shopName, itemName]: any = newArgs.matchAll(/(["'])(?:(?=(\\?))\2.)*?\1/g); // Attempt to match arguments
    let price = null;
    let num = newArgs.match(/[1-9]\d*(\.\d+)?$/);
    if (num) price = num[0];

    if (args.length == 3) { // Fixed length check, probably no quotes used
      shopName = args[0];
      itemName = args[1];
    } else { // Quotes most likely used
      if (!args[0].match(/['"]/)) { // If first index doesnt contain a quote, assign shopName to first arg, swap itemName with first match
        itemName = shopName;
        shopName = args[0];
      } else {
        shopName = shopName[0].replaceAll(',', ' ');
      }
      if (!itemName || itemName == undefined) {
        for (let i = 0; i < args.length; i++) {
          if (args[i].match(/['"]$/)) {
            itemName = args[i + 1];
            break;
          }
        }
      } else {
        itemName = itemName[0].replaceAll(',', ' ');
      }
    }
    if (price) price = Number(price).toFixed(2);
    return [shopName, itemName, price];
  }

  private async getStore(userId: string) {
    const store = await this.store.get(DS_STORES + userId);
    if (store == undefined || !store) {
      this.store.set(DS_STORES + userId, []);
      return [];
    }
    return store;
  }

  private canUseCommand(speaker: string): boolean {
    const plr = this.omegga.getPlayer(speaker);
    if (!plr) return false;
    if (plr.isHost()) return true;

    const hasRole = plr.getRoles().includes(this.config.checkRole);

    return this.config.whitelist ? hasRole : !hasRole;
  }

  private async registerStore(owner: OmeggaPlayer, storeName: string) {
    let currentStores: any[] = await this.getStore(owner.id);
    let [myStore, _] = await this.checkIfStoreExists(owner.id, storeName, currentStores);

    if (myStore) {
      this.omegga.whisper(owner, `Store with the name '${storeName}' already exists!`);
      return;
    }

    const newStore = {
      owner: owner.name,
      ownerID: owner.id,
      storeName: storeName,
      contents: []
    };

    currentStores.push(newStore);
    this.store.set(DS_STORES + owner.id, currentStores);
  }

  private async addOption(owner: OmeggaPlayer, storeName: string, newItem: string, price: number) {
    const playerStores = await this.getStore(owner.id);
    let [myStore, idx] = await this.checkIfStoreExists(owner.id, storeName, playerStores);

    if (!myStore) {
      this.omegga.whisper(owner, `Unable to find store '${storeName}'. (Store names are case-sensitive, maybe check that?)`);
      return
    }

    newItem = newItem.replace(/['"]/g, ''); // Remove quotes if left behind
    const wep = WEAPON_MAP[newItem.toLowerCase().trim()];
    if (!wep) {
      this.omegga.whisper(owner, `Unable to add item ${newItem}.`);
      return;
    }

    let capitalName = wep.match(/(?<=Weapon_).*/).toString();
    capitalName = capitalName.replace(/(?<![A-Z])([A-Z])/g, ' $1').trim();

    const product = {
      name: capitalName,
      item: wep,
      price: price
    }

    for (let i = 0; i < myStore.contents.length; i++) {
      if (myStore.contents[i].item == wep) {
        this.omegga.whisper(owner, `Shop ${myStore.storeName} already contains ${capitalName}!`);
        return;
      }
    }

    myStore.contents.push(product);
    playerStores[idx] = myStore;
    this.store.set(DS_STORES + owner.id, playerStores);
  }

  private async checkIfStoreExists(userId: string, storeName: string, stores?: any[]) {
    const playerStores: any[] = stores ? stores : await this.getStore(userId)
    if (playerStores == undefined || !playerStores) return null;

    let res = null
    let index = -1;
    playerStores.forEach((s, i) => {
      if (s['storeName'] == storeName) {
        res = s;
        index = i;
      }
    });
    return [res, index];
  }

  async init() {
    this.omegga.on('cmd:store:create', async (speaker: string, storeName: string) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!this.canUseCommand(speaker)) {
        this.omegga.whisper(speaker, 'You do not have permission to use that command.');
        return;
      }

      this.registerStore(plr, storeName);
    });


    this.omegga.on('cmd:store:owned', async (speaker: string) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!this.canUseCommand(speaker)) {
        this.omegga.whisper(speaker, 'You do not have permission to use that command.');
        return;
      }

      const stores = await this.getStore(plr.id);

      if (stores.length > 0) {
        this.omegga.whisper(speaker, 'Owned stores:');
        stores.forEach((s) => {
          this.omegga.whisper(speaker, s.storeName);
        });
      } else this.omegga.whisper(speaker, 'You have no stores!');
    });


    this.omegga.on('cmd:store:view', async (speaker: string, ...args: any[]) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!args || args.length == 0) {
        this.omegga.whisper(speaker, 'Please provide a store name.');
        return;
      }

      let storeName = args.toString().replace(/['"]/g, '');
      storeName = storeName.replace(/,/g, ' ');
      
      const [myStore, _] = await this.checkIfStoreExists(plr.id, storeName);

      if (!myStore) {
        this.omegga.whisper(speaker, `Unable to find store ${storeName}`);
        return;
      }

      this.omegga.whisper(speaker, `Contents of ${myStore.storeName}:`);
      const contentsLen = myStore.contents.length;
      if (contentsLen > 0) {
        myStore.contents.forEach((item, idx) => {
          this.omegga.whisper(speaker, `[${idx}] ${item.name}: ${item.price}`);
        });
      } else {
        this.omegga.whisper(speaker, 'Store is empty!');
      }
    });


    this.omegga.on('cmd:store:additem', async (speaker: string, ...args: any[]) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!args || args.length < 3) {
        this.omegga.whisper(speaker, 'Invalid number of arguments.');
        return;
      }

      let [shopName, itemName, price] = this.desconstructArgs(args);

      if (!this.argumentsValid([shopName, itemName, price])) {
        this.omegga.whisper(speaker, 'Invalid arguments.');
        return;
      }

      this.addOption(plr, shopName, itemName, parseFloat(price));
    });

    return { registeredCommands: ['store:create', 'store:open', 'store:owned', 'store:view', 'store:additem', 'store:removeitem', 'store:close'] };
  }

  async stop() { }
}
