import OmeggaPlugin, { OL, PS, PC, OmeggaPlayer } from 'omegga';
import Currency from './currency';

type Config = { checkRole: string, whitelist: boolean };
type Storage = { shops: any[] };

const DS_STORES = 'itemshop_stores_'; // const for stores key
const DS_IDS = 'itemshop_playerids_'; // const for playerIDs key

const WEAPON_MAP = { // Map for WeaponClass strings to more human-friendly ones
  'anti materiel rifle': 'Weapon_AntiMaterielRifle',
  'anti-materiel rifle': 'Weapon_AntiMaterielRifle', // Alias
  'arming sword': 'Weapon_ArmingSword',
  'assault rifle': 'Weapon_AssaultRifle',
  'classic assault rifle': 'Weapon_AssaultRifle', // Alias
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
  'submachine gun': 'Weapon_StandardSubmachineGun',
  'stick grenade': 'Weapon_StickGrenade',
  'suppressed submachine gun': 'Weapon_SubmachineGun', // This naming is stupid.
  'submachine gun (suppressed)': 'Weapon_SubmachineGun', // Alias
  'super shotgun': 'Weapon_SuperShotgun',
  'suppressed assault rifle': 'Weapon_SuppressedAssaultRifle',
  'assault rifle (suppressed)': 'Weapon_SuppressedAssaultRifle', // Alias
  'suppressed bullpup smg': 'Weapon_SuppressedBullpupSMG',
  'bullbup smg (suppressed)': 'Weapon_SuppressedBullpupSMG', // Alias
  'suppressed pistol': 'Weapon_SuppressedPistol',
  'pistol (suppressed)': 'Weapon_SuppressedPistol', // Alias
  'suppressed service rifle': 'Weapon_SuppressedServiceRifle',
  'service rifle (suppressed)': 'Weapon_SuppressedServiceRifle', // Alias
  'tactical shotgun': 'Weapon_TacticalShotgun',
  'tactical smg': 'Weapon_TacticalSMG',
  'tomahawk': 'Weapon_Tomahawk',
  'twin cannon': 'Weapon_TwinCannon',
  'typewriter smg': 'Weapon_TypewriterSMG',
  'zweihander': 'Weapon_Zweihander'
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
          const stringified = gathered.toString().replace(/^['"]|['"]$/g, '').replace(/,/g, ' ');
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

  private async checkIfShopExists(userId: string, shopName: string, stores?: any[]) { // Checks if a shop already exists
    const playerStores: any[] = stores ? stores : await this.getStore(userId)
    if (playerStores == undefined || !playerStores) return null;

    let res = null
    let index = -1;
    playerStores.forEach((s, i) => {
      if (s['shopName'] == shopName) {
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

  private async registerShop(owner: OmeggaPlayer, shopName: string, description?: string) { // Creates a shop
    let currentStores: any[] = await this.getStore(owner.id);
    let [myStore, _] = await this.checkIfShopExists(owner.id, shopName, currentStores);

    if (myStore) {
      this.omegga.whisper(owner, `<color="ff0000">!</> Shop with the name <color="ffff00">${shopName}</> already exists!`);
      return;
    }

    const newStore = {
      owner: owner.name,
      ownerID: owner.id,
      shopName: shopName,
      description: description,
      contents: []
    };

    currentStores.push(newStore);
    this.store.set(DS_STORES + owner.id, currentStores);
    this.omegga.whisper(owner, `Created shop ${shopName}!`);
  }

  private async addOption(owner: OmeggaPlayer, shopName: string, newItem: string, price: number) { // Adds option to shop
    const playerStores = await this.getStore(owner.id);
    let [myStore, idx] = await this.checkIfShopExists(owner.id, shopName, playerStores);

    if (!myStore) {
      this.omegga.whisper(owner, `<color="ff0000">!</> Unable to find shop <color="ffff00"${shopName}</>. (Shop names are case-sensitive, maybe check that?)`);
      return
    }

    newItem = newItem.replace(/['"]/g, ''); // Remove quotes if left behind
    const wep = WEAPON_MAP[newItem.toLowerCase().trim()];
    if (!wep) {
      this.omegga.whisper(owner, `<color="ff0000">!</> Unable to add item <color="d100d6">${newItem}</>.`);
      return;
    }

    let capitalName = wep.match(/(?<=Weapon_).*/).toString();
    capitalName = capitalName.replace(/(?<![A-Z])([A-Z])/g, ' $1').trim();

    if (capitalName == 'Submachine Gun') {
      capitalName = 'Suppressed Submachine Gun';
    }
    if (capitalName == 'Standard Submachine Gun') {
      capitalName = 'Submachine Gun';
    }

    const product = {
      name: capitalName,
      item: wep,
      price: price
    }

    for (let i = 0; i < myStore.contents.length; i++) {
      if (myStore.contents[i].item == wep) {
        this.omegga.whisper(owner, `<color="ff0000">!</> Shop <color="ffff00">${myStore.shopName}</> already contains <color="d100d6">${capitalName}</>!`);
        return;
      }
    }

    myStore.contents.push(product);
    playerStores[idx] = myStore;
    this.store.set(DS_STORES + owner.id, playerStores);
    this.omegga.whisper(owner, `Added <color="d100d6">${capitalName}</> to shop <color="ffff00">${myStore.shopName}</>!`);
  }


  async init() {
    const currency = new Currency(this.omegga);
    await currency.loadPlugin();

    // Ensure every player currently online has a name stored
    const currentPlayers = await this.omegga.getPlayers()
    currentPlayers.forEach((p) => {
      this.store.set(DS_IDS + p.id, p.name);
    });

    // Commands

    // shop:open
    this.omegga.on('cmd:shop:open', async (speaker: string, ...args: string[]) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!this.canUseCommand(plr)) {
        this.omegga.whisper(plr, 'You do not have permission to use that command.');
        return;
      }

      const decon = deconstructArgs(args);
      let [name, desc] = decon;
      if (!name) {
        this.omegga.whisper(plr, '<color="ff0000">!</> A name is required.');
        return;
      }
      if (name.match(/[<>]/)) {
        this.omegga.whisper(plr, '<color="ff0000">!</> Please exclude <code><</> and <code>></> from your shop name.');
        return;
      }
      if (!desc || desc == undefined) {
        desc = null;
      }

      this.registerShop(plr, name, desc);
    });

    this.omegga.on('cmd:shop:desc', async (speaker: string, ...args: string[]) => {
      const plr = this.omegga.getPlayer(speaker);

      if (!this.canUseCommand(plr)) {
        this.omegga.whisper(plr, 'You do not have permission to use this command.');
        return;
      }

      const decon = deconstructArgs(args);
      if (decon.length < 2) {
        this.omegga.whisper(plr, '<color="ff0000">!</> Invalid number of arguments.');
        return;
      }
      let [shopName, desc] = decon;

      const stores = await this.getStore(plr.id);
      const [myShop, idx] = await this.checkIfShopExists(plr.id, shopName, stores);

      if (!myShop) {
        this.omegga.whisper(plr, `<color="ff0000">!</> Store <color="ffff00">${shopName}</> does not exist.`);
        return;
      }

      myShop.description = desc;
      stores[idx] = myShop;
      this.store.set(DS_STORES + plr.id, stores);
      this.omegga.whisper(plr, `Successfully updated description of shop <color="ffff00">${shopName}</>!`);
    });

    // shop:close
    this.omegga.on('cmd:shop:close', async (speaker: string, ...args: any[]) => {
      const plr = this.omegga.getPlayer(speaker);

      if (!this.canUseCommand(plr)) {
        this.omegga.whisper(plr, 'You do not have permission to use this command.');
        return;
      }

      const decon = deconstructArgs(args);
      if (decon.length < 1) {
        this.omegga.whisper(plr, '<color="ff0000">!</> Please provide a store name.');
        return;
      }
      const [shopName] = decon;


      let stores = await this.getStore(plr.id);
      let [myStore, idx] = await this.checkIfShopExists(plr.id, shopName, stores);

      if (myStore) {
        stores.splice(idx, 1);
        this.store.set(DS_STORES + plr.id, stores);
        this.omegga.whisper(plr, `Successfully removed shop <color="ffff00">${shopName}</>.`);
      } else this.omegga.whisper(plr, `<color="ff0000">!</> Unable to find shop <color="ffff00">${shopName}</>.`);
    });

    // shop:owned
    this.omegga.on('cmd:shop:owned', async (speaker: string) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!this.canUseCommand(plr)) {
        this.omegga.whisper(plr, 'You do not have permission to use that command.');
        return;
      }

      const stores = await this.getStore(plr.id);

      if (stores.length > 0) {
        this.omegga.whisper(plr, 'Owned stores:');
        stores.forEach((s) => {
          this.omegga.whisper(plr, `<color="ffff00">${s.shopName}</>`);
        });
      } else this.omegga.whisper(plr, '<color="ff0000">!</> You have no stores!');
    });

    // shop:view
    this.omegga.on('cmd:shop:view', async (speaker: string, ...args: any[]) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!args || args.length == 0) {
        this.omegga.whisper(plr, '<color="ff0000">!</> Please provide a store name.');
        return;
      }

      let shopName = args.toString().replace(/['"]/g, '');
      shopName = shopName.replace(/,/g, ' ');

      const [myStore, _] = await this.checkIfShopExists(plr.id, shopName);

      if (!myStore) {
        this.omegga.whisper(plr, `<color="ff0000">!</> Unable to find store <color="ffff00">${shopName}</>`);
        return;
      }

      this.omegga.whisper(plr, `Contents of ${myStore.shopName}:`);
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

    // shop:additem
    this.omegga.on('cmd:shop:additem', async (speaker: string, ...args: any[]) => {
      const plr = this.omegga.getPlayer(speaker);
      if (!this.canUseCommand(plr)) {
        this.omegga.whisper(plr, 'You do not have permission to use this command.');
        return;
      }

      if (!args || args.length < 3) {
        this.omegga.whisper(speaker, '<color="ff0000">!</> Invalid number of arguments.');
        return;
      }

      const decon = deconstructArgs(args);
      if (decon.length != 3) {
        this.omegga.whisper(plr, '<color="ff0000">!</> Invalid number of arguments!');
        return;
      }

      let [shopName, itemName, price] = decon;

      if (!parseFloat(price)) {
        this.omegga.whisper(plr, '<color="ff0000">!</> Price must be a number!');
        return;
      }

      this.addOption(plr, shopName, itemName, await currency.round(parseFloat(price))); // TODO: Move this out of a function
    });


    // shop:removeitem
    this.omegga.on('cmd:shop:removeitem', async (speaker: string, ...args: []) => {
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
        this.omegga.whisper(plr, '<color="ff0000">!</> Invalid number of arguments.');
        return;
      }
      let [shopName, itemName] = decon;

      const stores = await this.getStore(plr.id);
      let [myStore, idx] = await this.checkIfShopExists(plr.id, shopName, stores);

      if (!myStore) {
        this.omegga.whisper(plr, `<color="ff0000">!</> Store named <color="ffff00">${shopName}</> does not exist.`);
        return;
      }

      const wep = WEAPON_MAP[itemName.toLowerCase()];
      if (!wep) {
        this.omegga.whisper(plr, `<color="ff0000">!</> Item <color="d100d6">${itemName}</> unavailable.`);
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
      this.omegga.whisper(plr, `Removed <color="d100d6">${itemName}</> from shop.`);
    });


    // Debug command for removing all stores of runner
    this.omegga.on('cmd:debugremove', async (speaker: string) => {
      const plr = this.omegga.getPlayer(speaker);

      await this.store.delete(DS_STORES + plr.id);
      this.omegga.whisper(plr, 'Cleared data stores');
    });


    // Events
    this.omegga.on('event:store', async (clicker: OmeggaPlayer, owner: string, shopName: string) => {
      if (!owner || !shopName) return;
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
      const [store, _] = await this.checkIfShopExists(vendorID, shopName, vendorStores);

      if (!store) return;

      this.omegga.whisper(clicker, store.shopName);
      this.omegga.whisper(clicker, store.description ? store.description : '');

      if (store.contents.length != 0) {
        store.contents.forEach(async (v) => {
          this.omegga.whisper(clicker, `${v.name}: ${await currency.format(v.price)}`);
        });
      } else this.omegga.whisper(clicker, 'This store is empty...');
    });

    this.omegga.on('join', async (player: OmeggaPlayer) => {
      this.store.set(DS_IDS + player.id, player.name);
    });

    return { registeredCommands: ['shop:open', 'shop:desc', 'shop:owned', 'shop:view', 'shop:additem', 'shop:removeitem', 'shop:close'] };
  }

  async stop() { }
}
