/*
 * Copyright 2022, OpenRemote Inc.
 *
 * See the CONTRIBUTORS.txt file in the distribution for a
 * full listing of individual contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
package org.openremote.model.asset.impl;

import org.openremote.model.asset.Asset;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

/**
 * This is only needed so JPA can deserialise an Asset whose type doesn't match an entity otherwise it is un-used
 */
@Entity
@DiscriminatorValue("not null")
public class UnknownAsset extends Asset<ThingAsset> {
    /**
     * For use by hydrators (i.e. JPA/Jackson)
     */
    protected UnknownAsset() {
    }

    public UnknownAsset(String name) {
        super(name);
    }
}
