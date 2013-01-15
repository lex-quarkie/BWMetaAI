var fs = require('fs');

function Race(name) {
    function loadContents(filename, skip_block_header) {
        var raw;
        
        filename = filename.replace('.pyai', '')
        filename += '.pyai'
        
        if(fs.existsSync(name + '/' + filename)) {
            filename = name + '/' + filename;
        }
        
        return parseTemplate(filename, skip_block_header);
    }

    function expandEnemyOwns(units, block) {
        var out = "";
        
        for(var i = 0; i < units.length; i += 1) {
            out += 'enemyowns_jump(' + units[i] + ', ' + block + ')\n';
        }
        
        return out;
    }

    this.loadContents = loadContents;

    function parseTemplate(filename, skip_block_header) {
        var comment = "\n#" + filename + '\n';
        var block;
        
        var owned = {};
            
        if(!skip_block_header) {
            block = (filename.indexOf('header') > -1 ? '' : '--' + getFileBlock(filename) + '--\n');
        } else {
            block = "";
        }
        
        var content = fs.readFileSync(filename, 'utf-8');
    
        content = content.replace(/repeat\(\)/g, 'goto(' + getFileBlock(filename) + ')');
        
        content = content.replace(/include\((.*)\)/g, function(command, filename) {
            return loadContents(filename, true);
        });
        
        function race_skip(races, skip_block) {
            races = races.replace(/ /g, '');
            races = races.split(',');
            
            valid_enemies = {};
            
            for(var i = 0; i < races.length; i +=1) {
                valid_enemies[races[i].toLowerCase()[0]] = true;
            }
            
            var complete = getFileBlock(filename) + '_race_checked';
            
            return('race_jump(' +
                (valid_enemies.t ? complete : skip_block) + ',' +
                (valid_enemies.z ? complete : skip_block) + ',' +
                (valid_enemies.p ? complete : skip_block) +
                ')\n' +
                '--' + complete + '--\n');
        }
        
        content = content.replace(/valid_build_against\((.*)\)/g, function(original, races) {
            return race_skip(races, 'gen_opening')
        });
        
        content = content.replace(/valid_style_against\((.*)\)/g, function(original, races) {
            return race_skip(races, 'gen_styles')
        });

        content = content.replace(/enemyownscloaked_jump\((.*)\)/g, function(original, block) {
            var units = ['Zerg Lurker', 'Protoss Dark Templar', 'Terran Ghost', 'Terran Wraith'];
            return expandEnemyOwns(units, block);
        });

        content = content.replace(/enemyownsairtech_jump\((.*)\)/g, function(original, block) {
            var units = ['Terran Starport', 'Protoss Stargate', 'Zerg Spire'];
            return expandEnemyOwns(units, block);
        });
        
        content = content.replace(/build_start\((.*)\)/g, function(original, args) {
            args = args.split(',');
            var amount = args[0];
            var building = args[1];
            var priority = args[2] || '80';
            return 'build(' + amount + ', ' + building + ', ' + priority + ')\n' +
                   'wait_buildstart(' + amount + ', ' + building + ')';
        });

        content = content.replace(/build_finish\((.*)\)/g, function(original, args) {
            args = args.split(',');
            var amount = args[0];
            var building = args[1];
            var priority = args[2] || '80';
            return 'build(' + amount + ', ' + building + ', ' + priority + ')\n' +
                   'wait_buildstart(' + amount + ', ' + building + ')\n' +
                   'wait_build(' + amount + ', ' + building + ')';
        });

        content = content.replace(/attack_train\((.*)\)/g, function(original, args) {
            args = args.split(',');
            var amount = args[0];
            var unit = args[1];
            return 'train(' + amount + ', ' + unit + ')\n' +
                   'attack_add(' + amount + ', ' + unit + ')';
        });

        content = content.replace(/^(\d+) (.*)$/mg, function(original, supply, building) {
            if(!owned[building]) {
                owned[building] = 0;
            }
            owned[building] += 1;
            
            return 'build(' + supply + ', Peon, 80)\n' +
                      'wait_buildstart(' + supply + ', Peon)\n' +
                      'build(' + owned[building] + ', ' + building + ', 80)\n' +
                      'wait_buildstart(' + owned[building] + ', ' + building + ')\n';
        });

        if (name === 'terran') {
            content = content.replace(/Town Hall/g, "Terran Command Center");
            content = content.replace(/Peon/g, "Terran SCV");
            content = content.replace(/Gas/g, "Terran Refinery");
        }
        
        if (name === 'zerg') {
            content = content.replace(/Town Hall/g, "Zerg Hatchery");
            content = content.replace(/Peon/g, "Zerg Drone");
            content = content.replace(/Gas/g, "Zerg Extractor");
        }
        
        if (name === 'protoss') {
            content = content.replace(/Town Hall/g, "Protoss Nexus");
            content = content.replace(/Peon/g, "Protoss Probe");
            content = content.replace(/Gas/g, "Protoss Assimilator");
        }
        
        return comment + block + content;
    }
    
    function getFileBlock(filename) {
        var block = 'gen_' + filename;
        block = block.replace(/[-_ \/]/g, '_');
        block = block.replace('.pyai', '')
        block = block.replace(name, '');
        block = block.replace(/__/g, '_');
        return block;
    }

    return this;
}

module.exports = Race;