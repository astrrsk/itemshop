import OmeggaPlugin, { OL, PS, PC, OmeggaPlayer } from 'omegga';

type Config = { checkRole: string, whitelist: boolean };
type Storage = { shops: any[] };

const DS_STORES = 'itemshop_stores_'; // const for stores key
const DS_IDS = 'itemshop_playerids_'; // const for playerIDs key

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

function argumentsValid(args: string[]): boolean { // Check if any arguments provided are undef or null
  let undef = true;
  args.forEach((i) => {
    if (i === undefined || !i) undef = false;
  });
  return undef;
}

function deconstructArgs(args: string[]): string[] {
  let results: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const current = args[i];

    if (current.match(/^['"]/)) {
      let gathered = [];
      gathered.push(current);

      for (let j = i + 1; j < args.length; j++) {
        const nested = args[j];
        gathered.push(nested);

        if (nested.match(/['"]$/)) {
          i = j;
          const stringified = gathered.toString().replace(/['"]/g, '').replace(/,/g, ' ');
          results.push(stringified);
          break;
        }
      }
    } else results.push(current);
  }

  return results;
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


  // Plugin methods
  private async getStore(userId: string) { // Get data store, or assign to empty if not present
    const store = await this.store.get(DS_STORES + userId);
    if (store == undefined || !store) {
      this.store.set(DS_STORES + userId, []);
      return [];
    }
    return store;
  }

  private async checkIfStoreExists(userId: string, storeName: string, stores?: any[]) { // Checks if a store already exists
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

  private canUseCommand(speaker: string | OmeggaPlayer): boolean { // Check if player can use this command
    const plr = typeof (speaker) == 'string' ? this.omegga.getPlayer(speaker) : speaker;
    if (!plr) return false;
    if (plr.isHost()) return true;

    const hasRole = plr.getRoles().includes(this.config.checkRole);

    return this.config.whitelist ? hasRole : !hasRole;
  }

  private async registerStore(owner: OmeggaPlayer, storeName: string, description?: string) { // Creates store
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
      description: description,
      contents: []
    };

    currentStores.push(newStore);
    this.store.set(DS_STORES + owner.id, currentStores);
    this.omegga.whisper(owner, `Created store ${storeName}!`);
  }

  private async addOption(owner: OmeggaPlayer, storeName: string, newItem: string, price: number) { // Adds option to store
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
    this.omegga.whisper(owner, `Added ${capitalName} to store ${myStore.storeName}!`);
  }


  async init() {
    const currentPlayers = await this.omegga.getPlayers()
    currentPlayers.forEach((p) => {
      this.store.set(DS_IDS + p.id, p.name);
    });

    this.omegga.on('cmd:store:open', async (speaker: string, ...args: string[]) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!this.canUseCommand(plr)) {
        this.omegga.whisper(plr, 'You do not have permission to use that command.');
        return;
      }

      const decon = deconstructArgs(args);
      let [name, desc] = decon;
      if (!name) {
        this.omegga.whisper(plr, 'A name is required.');
        return;
      }
      if (!desc || desc == undefined) {
        desc = null;
      }

      this.registerStore(plr, name, desc);
    });


    this.omegga.on('cmd:store:owned', async (speaker: string) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!this.canUseCommand(plr)) {
        this.omegga.whisper(plr, 'You do not have permission to use that command.');
        return;
      }

      const stores = await this.getStore(plr.id);

      if (stores.length > 0) {
        this.omegga.whisper(plr, 'Owned stores:');
        stores.forEach((s) => {
          this.omegga.whisper(plr, s.storeName);
        });
      } else this.omegga.whisper(plr, 'You have no stores!');
    });


    this.omegga.on('cmd:store:view', async (speaker: string, ...args: any[]) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!args || args.length == 0) {
        this.omegga.whisper(plr, 'Please provide a store name.');
        return;
      }

      let storeName = args.toString().replace(/['"]/g, '');
      storeName = storeName.replace(/,/g, ' ');

      const [myStore, _] = await this.checkIfStoreExists(plr.id, storeName);

      if (!myStore) {
        this.omegga.whisper(plr, `Unable to find store '${storeName}'`);
        return;
      }

      this.omegga.whisper(plr, `Contents of ${myStore.storeName}:`);
      this.omegga.whisper(plr, myStore.description ? myStore.description : 'This store lacks a description.');
      const contentsLen = myStore.contents.length;
      if (contentsLen > 0) {
        myStore.contents.forEach((item, idx) => {
          this.omegga.whisper(plr, `[${idx}] ${item.name}: $${item.price.toFixed(2)}`);
        });
      } else {
        this.omegga.whisper(plr, 'Store is empty!');
      }
    });


    this.omegga.on('cmd:store:additem', async (speaker: string, ...args: any[]) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!this.canUseCommand(plr)) {
        this.omegga.whisper(plr, 'You do not have permission to use this command.');
        return;
      }

      if (!args || args.length < 3) {
        this.omegga.whisper(speaker, 'Invalid number of arguments.');
        return;
      }

      const decon = deconstructArgs(args);
      if (decon.length != 3) {
        this.omegga.whisper(plr, 'Invalid number of arguments!');
        return;
      }

      let [shopName, itemName, price] = decon;

      if (!parseFloat(price)) {
        this.omegga.whisper(plr, 'Price must be a number!');
        return;
      }

      this.addOption(plr, shopName, itemName, parseFloat(price)); // TODO: Move this out of a function
    });


    this.omegga.on('cmd:store:removeitem', async (speaker: string, ...args: []) => {
      const plr = this.omegga.getPlayer(speaker);

      if (!this.canUseCommand(speaker)) {
        this.omegga.whisper(plr, 'You do not have permission to use this command.');
        return;
      }

      if (!args || args.length <= 0) {
        return;
      }

      const decon: string[] = deconstructArgs(args);
      if (decon.length != 2) {
        this.omegga.whisper(plr, 'Invalid number of arguments.');
        return;
      }
      let [shopName, itemName] = decon;

      const stores = await this.getStore(plr.id);
      let [myStore, idx] = await this.checkIfStoreExists(plr.id, shopName, stores);

      if (!myStore) {
        this.omegga.whisper(plr, `Store named ${shopName} does not exist.`);
        return;
      }

      const wep = WEAPON_MAP[itemName.toLowerCase()];
      if (!wep) {
        this.omegga.whisper(plr, `Item '${itemName} unavailable.'`);
        return;
      }

      for (let i = 0; i < myStore.contents.length; i++) {
        let obj = myStore.contents[i];

        if (obj.item == wep) {
          myStore.contents.splice(i, 1);
          break;
        }
      }

      stores[idx] = myStore;
      this.store.set(DS_STORES + plr.id, stores);
      this.omegga.whisper(plr, `Removed item from shop.`);
    });



    this.omegga.on('cmd:debugremove', async (speaker: string) => {
      const plr = this.omegga.getPlayer(speaker);

      await this.store.delete(DS_STORES + plr.id);
      this.omegga.whisper(plr, 'Cleared data stores');
    });

    this.omegga.on('event:store', async (clicker: OmeggaPlayer, owner: string, storeName: string) => {
      if (!owner || !storeName) return;
      const vendor = this.omegga.getPlayer(owner);
      let vendorID = null;

      if (vendor) {
        vendorID = vendor.id;
      } else {
        const allKeys = await this.store.keys();

        for (const k of allKeys) {
          if (k.match(DS_IDS)) {
            const current = await this.store.get(k);
            if (current && current == owner) {
              vendorID = k.match(/(?<=itemshop_playerids_).*/);
              break;
            }
          }
        }
      }

      if (!vendorID) return;

      const vendorStores = await this.getStore(vendorID);
      const [store, _] = await this.checkIfStoreExists(vendorID, storeName, vendorStores);

      if (!store) return;

      this.omegga.whisper(clicker, store.storeName);
      this.omegga.whisper(clicker, store.description ? store.description : '');

      if (store.contents.length != 0) {
        store.contents.forEach((v, i) => {
          this.omegga.whisper(clicker, `${v.name}: $${v.price.toFixed(2)}`);
        });
      } else this.omegga.whisper(clicker, 'This store is empty...');
    });


    this.omegga.on('join', async (player: OmeggaPlayer) => {
      this.store.set(DS_IDS + player.id, player.name);
    });

    return { registeredCommands: ['store:open', 'store:owned', 'store:view', 'store:additem', 'store:removeitem', 'store:close'] };
  }

  async stop() { }
}
