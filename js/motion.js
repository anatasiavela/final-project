import * as THREE from './three/build/three.module.js';
import {wheels, grid, chassis, brakeMaterial, carWhole} from './main.js';
import info from './info_ferrari_458.js';
import {buttonsStatus, newPress, cacheStatus } from './gamepad.js';

//constants
let g = 9.8;
let PARK = -1;

//engine specs
let gear_ratios = info["gear-ratios"];
let FD_ratio = info["final-drive-ratio"];
let RPM2Torque = info["RPM2Torque"];
let optimal_rpm = info["optimal-rpm"];
let idling_rpm = info["idling-rpm"];
let max_rpm = info["max-rpm"];
let redline_rpm = info["redline-rpm"];
let transmission_efficiency = 0.75;

//body specs
let height = info["height"];
let r_wheel = info["wheel-diameter"]/2;
let r_rim = info["rim-diameter"]/2;
let mass = info["mass"];
let mass_dist = info["weight-distribution"];
let wheelbase = info["wheelbase"];
let c = mass_dist[0] * wheelbase;                   // distance from CG to rear axle
let b = mass_dist[1] * wheelbase;                   // distance from CG to front axle
let Ca = 1;                                         // cornering stiffness
let Crr = 1;                                      // rolling resistance constant
let Cdrag = 0.5 * 0.33 * 1.95 * 1.29;               //drag coefficient * frontal area * density of air
let Cf = 1;                                         // coefficient of friction

// curr specs
var a = 0;
var v = new THREE.Vector2(2.369, 0);
var p = new THREE.Vector2();
var w = v.length()/r_wheel;                         // angular velocity of the car
var d = 0;                                          // angular orientation of the car
var sigma = 0;                                      // steering angle of the car
var curr_rpm = idling_rpm;
var curr_gear = 1;
var braking = 0;
var automatic = true;
var lon_momentum = 0;
var lat_momentum = 0;

// timing
var go = 0;
var start_time = 0;
var time_since_start = 0;

var calculate_torque_engine = d3.scale.linear()
    .domain(RPM2Torque.map(function(p){return p[0];}))
    .range(RPM2Torque.map(function(p){return p[1];}));

function engine(dt) {
    var alpha_f = Math.atan((v.y + Math.abs(w) * b) / v.x) - sigma * Math.sign(v.x);
    var alpha_r = Math.atan((v.y - Math.abs(w) * c) / v.x);

    var load_f = mass_dist[0] * mass * g - height/2.5/wheelbase * mass * a;
    var load_r = mass_dist[1] * mass * g + height/2.5/wheelbase * mass * a;

    var F_lat_f = Ca * alpha_f * load_f / mass;
    var F_lat_r = Ca * alpha_r * load_r / mass;

    var rpm = v.length() * FD_ratio * gear_ratios[curr_gear] * 60 / (2 * Math.PI * r_wheel);
    curr_rpm = Math.max(idling_rpm, Math.min(redline_rpm, rpm));

    if (automatic)
        automaticTransmission();

    // traction force
    var F_traction;
    if (braking)
        F_traction = - Cf * mass * g;
    else if (curr_gear == -1)
        F_traction = 1000 * buttonsStatus[7];
    else {
        var T_e = calculate_torque_engine(curr_rpm);
        var T_w = T_e * gear_ratios[curr_gear] * FD_ratio * transmission_efficiency;
        F_traction = T_w / r_wheel * buttonsStatus[7];
    }
    if (!document.getElementById("traction-switch").checked)
        F_traction = 0;

    // resistance forces: rolling resistance and drag
    var F_rr_x = -Crr * v.x;
    var F_rr_z = -Crr * v.y;
    if (!document.getElementById("rr-switch").checked) {
        F_rr_x = 0;
        F_rr_z = 0;
    }

    var F_drag_x = -Cdrag * v.x * Math.abs(v.x);
    var F_drag_z = -Cdrag * v.y * Math.abs(v.y);
    if (!document.getElementById("drag-switch").checked){
        F_drag_x = 0;
        F_drag_z = 0;
    }

    var F_resistance_x = F_rr_x + F_drag_x;
    var F_resistance_z = F_rr_z + F_drag_z;

    // sum forces to compute acceleration
    var F_x = F_traction + F_lat_f * Math.sin(sigma) + F_resistance_x;
    var F_z = F_lat_r + F_lat_f * Math.cos(sigma) + F_resistance_z;
    //console.log("sigma " + sigma);
    /* console.log("v.y " + v.y);
    console.log("F_z " + F_z);  */
    
    var a_x = F_x / mass;
    var a_z = F_z / mass;

    // torque to compute angular acceleration
    var T = Math.cos(sigma) * F_lat_f * b - F_lat_r * c;
    var a_ang = T / (0.5 * mass * r_wheel * r_wheel);             // TODO mass of wheel

    // update linear values
    var dir = curr_gear == 0 || a_x < 0? -1 : 1; 
    a = dir * Math.sqrt(a_x**2 + a_z**2);

    var redline_v = r_wheel * 2 * Math.PI * redline_rpm / (60 * gear_ratios[curr_gear] * FD_ratio);
    var dv = new THREE.Vector2(dt * a_x, dt * a_z);
    var prev_v = v.length();
    v.add(dv);
    if (v.length() > redline_v && prev_v < v.length()) {
        v.sub(dv);
    }

    //console.log(v);
    var dp = new THREE.Vector2(dt * v.x, dt * v.y);
    p.add(dp);

    if (curr_gear == 0) v.x = Math.min(0, v.x);
    if (curr_gear != 0) v.x = Math.max(0, v.x);

    if(v.length() == 0){
        a = 0;
    }

    // update angular values
    w += dt * a_ang;
    d += dt * w;
    //console.log(w);


    var dir = curr_gear == 0? -1 : 1;
    var rot_speed = dir * v.length() / r_wheel;

    for ( var i = 0; i < wheels.length; i ++ ) {
        wheels[ i ].rotation.order = 'YZX';
        if (i == 0 || i == 1)
            wheels[ i ].rotation.y = sigma;         // only turn front wheels
        wheels[ i ].rotation.x += -dt*rot_speed/(2*Math.PI);
    }

    if (carWhole) {
        carWhole.translateZ(-dt*rot_speed/(2*Math.PI) * Math.cos(sigma));
        carWhole.translateX(-dt*rot_speed/(2*Math.PI) * Math.sin(sigma));
        carWhole.rotation.y += sigma/(2* Math.PI);
    }

    if (brakeMaterial) {
        if (braking) {
            brakeMaterial.transmissive = 0;
            brakeMaterial.metalness = 1;
        }
        else {
            brakeMaterial.transmissive = 1;
            brakeMaterial.metalness = 0;
        }
    }

    /* if (chassis) {
        lat_momentum = sigma/(2* Math.PI) * v.length();
        lon_momentum = zTween(lon_momentum, a / dt, dt * 6);
        chassis.rotation.x = lat_momentum * 0.0002;
        chassis.rotation.y = lon_momentum * 0.0002;
    } */
}

function zTween(_val, _target, _ratio) {
    return _val + (_target - _val) * Math.min(_ratio, 1.0);
}

function automaticTransmission() {
    var shift_rpm = optimal_rpm;

    var v_max = r_wheel * 2 * Math.PI * shift_rpm / (60 * gear_ratios[curr_gear] * FD_ratio);
    if (curr_gear != 7 && v.x > v_max) {
        curr_gear++;
        return;
    }

    var v_max_lower_gear = r_wheel * 2 * Math.PI * shift_rpm / (60 * gear_ratios[curr_gear-1] * FD_ratio);
    if (curr_gear != 1 && v.x < v_max_lower_gear)
        curr_gear--;
}

function readJoystickInput() {
    //a = 0;
    braking = false;
    for (var i = 0; i < buttonsStatus.length; i++) {
        switch (i) {
            case 7:     // gas
                if (buttonsStatus[7] && curr_gear != -1 && !go){
                    go = 1;
                    start_time = performance.now();
                }
                break;
            case 6:     // braking
                if (buttonsStatus[6] && curr_gear != -1){
                    braking = true;
                }
                break; 
            case 1:     // upshift
                if ( buttonsStatus[1] && newPress(1) && curr_gear < 7) {
                    curr_gear++;
                    console.log("upshift at "+ curr_rpm);
                    automatic = false;
                }
                break;
            case 3:     // downshift
                if ( buttonsStatus[3] && newPress(3) && curr_gear > 0) {
                    curr_gear--;
                }
                break;
            case 9:     // reload page
                if ( buttonsStatus[9] && newPress(9)) {    
                    window.location.reload(false);
                }
                break;
            case 8:     // restart time
                if ( buttonsStatus[8]) {    
                    go = 0;
                    start_time = 0;
                    time_since_start = 0;
                }
                break;
            case 0:     // park
                if ( buttonsStatus[0]) {    
                    curr_gear = PARK;
                }
                break;
            case 10:     // automatic <-> manual
                if ( buttonsStatus[10] && newPress(10)) {
                    automatic = !automatic;
                }
                break;
            case 17:     // wheel turn
                sigma = Math.round(-buttonsStatus[17]/4 * 30) / 30;
        }
    }

    cacheStatus();
}

function update(t, last_t){
    var time_delta = t - last_t;

    if (curr_gear != PARK)
        engine(time_delta);
    readJoystickInput();

    if (go)
        time_since_start = (performance.now() - start_time) / 1000;

    var speed = Math.round((Math.abs(v.length() * 2.23694) + Number.EPSILON) * 10) / 10;
    /* if (speed % 10 == 0)
        console.log("0 to " + speed + ": " + time_since_start); */

    document.getElementById('a').innerHTML = Math.round((a + Number.EPSILON) * 10) / 10;
    document.getElementById('v').innerHTML = speed;
    var gear = curr_gear == PARK? 'P' : curr_gear == 0? 'R' : curr_gear;
    document.getElementById('curr-gear').innerHTML = gear;
    document.getElementById('curr-rpm').style.color = curr_rpm > redline_rpm ? "red" : "black";
    document.getElementById('curr-rpm').innerHTML = Math.round(curr_rpm);
    document.getElementById('time').innerHTML = Math.round((time_since_start + Number.EPSILON)* 10) / 10;
    var transmission = automatic? "automatic" : "manual";
    document.getElementById('transmission').innerHTML = transmission;
}

export{update};